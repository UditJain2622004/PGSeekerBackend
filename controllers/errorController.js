const AppError = require("../utils/appError");

module.exports = (err, req, res, next) => {
  console.log(err);
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "internal server error";

  //wrongmongodb error
  if (err.name === "CastError") {
    const message = `Resources not found.Invalid"${err.path}`;
    err = new AppError(message, 400);
  }

  //mongoose duplicate key error
  if (err.code === 11000) {
    const message = `Duplicate ${Object.keys(err.keyValue)} entered`;
    err = new AppError(message, 400);
  }
  //wrong JWT error
  if (err.name === "JsonWebTokenError") {
    const message = `Json Web Token is invalid,try again`;
    err = new AppError(message, 400);
  }
  //JWT Expire error
  if (err.name === "Token Expired Error") {
    const message = `Json Web Token is expired`;
    err = new AppError(message, 400);
  }

  if (err.name === "MulterError") {
    const message = `You can upload maximum 50 pictures`;
    err = new AppError(message, 400);
  }

  res.status(err.statusCode).json({
    success: false,
    error: err.message,
  });
};
