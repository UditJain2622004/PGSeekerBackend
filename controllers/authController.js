const crypto = require("crypto");
const util = require("util");
const jwt = require("jsonwebtoken");
const User = require("../models/usermodel");
const AppError = require("../utils/appError");
const Email = require("../utils/email");

const pug = require("pug");
const { log } = require("console");

const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  try {
    console.log(user);
    const token = signToken(user._id);
    console.log(token);
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      domain: "localhost",
      // httpOnly: true, //  with "httpOnly :true" browser can not modify our cookie, it can just recieve it
    };

    //   if (req.secure || req.headers["x-forwarded-proto"] === "https")
    //     cookieOptions.secure = true;

    res.cookie("jwt", token, cookieOptions);

    user.password = undefined;

    res.status(statusCode).json({
      status: "success",
      // token,
      data: {
        user: user,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.signup = async (req, res, next) => {
  try {
    console.log(req.body);
    const newUser = await User.create({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      passwordConfirm: req.body.passwordConfirm,
      role: req.body.role,
    });
    console.log(newUser);

    // const url = `${req.protocol}://${req.get("host")}/me`;
    // await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, req, res);
  } catch (err) {
    next(err);
  }
};

exports.logIn = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    console.log(email, password);

    // 1) Check if email & password are given in request
    if (!req.body.email || !req.body.password) {
      return next(new AppError("Please provide email and password", 400));
    }
    // 2) Check if user exists & password is correct
    const user = await User.findOne({ email: email }).select("+password");

    if (!user || !(await user.comparePassword(password, user.password))) {
      return next(new AppError("Incorrect email or password!!", 401));
    }
    // 3) If everything ok, send token to client
    createSendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res, next) => {
  res.cookie("jwt", "", {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
  });
  res.status(200).json({
    status: "success",
  });
};

exports.protect = async (req, res, next) => {
  try {
    token = req.cookies.jwt;

    if (!token) {
      return next(
        new AppError("You are not logged in. Please log in to get access.", 401)
      );
    }

    // Verification token  ====================================================================================
    const decoded = await util.promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET
    );

    // Check if user still exists  ==========================================================================
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists", 401)
      );
    }

    // Check if user changed password after JWT token was issued  ===========================================
    if (currentUser.passwordChangedAfter(decoded.iat)) {
      return next(
        new AppError("User recently changed password. Please log in again", 401)
      );
    }

    // Grant access to PROTECTED ROUTE  =============================================================================
    req.user = currentUser;
    // res.locals.user = currentUser;
    next();
  } catch (err) {
    next(err);
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};
// ==================================================================================================================

exports.forgotPassword = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return next(new AppError("There is no user with this email", 404));

    // Generate the random reset token
    const resetToken = await user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    try {
      const resetUrl = `${req.protocol}://${req.get(
        "host"
      )}/api/v1/user/resetPassword/${resetToken}&${user.email}`;
      const html = pug.renderFile(`${__dirname}/../views/passwordReset.pug`, {
        firstName: user.name,
        url: resetUrl,
        subject: "Password reset",
      });

      await Email({
        email: user.email,
        subject: "Your password reset token (Valid for 10 minutes only)",
        // message: resetUrl,
        html: html,
      });

      res.status(200).json({
        status: "success",
        message: "Token sent to email",
      });

      // if there was some error sending email, we should delete the token and expiry field
    } catch (err) {
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return next(
        new AppError(
          "There was an errror sending the email. Try again later",
          500
        )
      );
    }
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      email: req.params.email,
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError("Token is invalid or expired", 400));
    }
    console.log(req.body);

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

exports.updatePassword = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    const password = req.body.currentPassword;
    if (!(await user.comparePassword(password, user.password))) {
      return next(new AppError("Wrong password", 401));
    }

    user.password = req.body.newPassword;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    createSendToken(user, 200, req, res);
  } catch (err) {
    next(err);
  }
};

exports.isLoggedIn = async (req, res, next) => {
  try {
    // console.log("Hello");
    // console.log(req.cookies);
    token = req.cookies.jwt;

    if (!token) {
      return next(
        new AppError("You are not logged in. Please log in to get access.", 401)
      );
    }

    // Verification token  ====================================================================================
    const decoded = await util.promisify(jwt.verify)(
      token,
      process.env.JWT_SECRET
    );
    // console.log(decoded);
    // Check if user still exists  ==========================================================================
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new AppError("The user belonging to this token no longer exists", 401)
      );
    }

    // Check if user changed password after JWT token was issued  ===========================================
    if (currentUser.passwordChangedAfter(decoded.iat)) {
      return next(
        new AppError("User recently changed password. Please log in again", 401)
      );
    }

    // Grant access to PROTECTED ROUTE  =============================================================================
    req.user = currentUser;
    // res.locals.user = currentUser;
    res.status(200).json({
      status: "success",
    });
    // next();
  } catch (err) {
    res.status(401).json({
      status: "failure",
    });
  }
};
