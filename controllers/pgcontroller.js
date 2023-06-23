const express = require("express");
const cloudinary = require("cloudinary");
const multer = require("multer");
const fs = require("fs");

const AppError = require("./../utils/appError");
const Pg = require("./../models/pgmodel.js");
const { log } = require("console");

const capitalizeEachWord = (str) => {
  const capital = str.replace(/(^\w{1})|(\s+\w{1})/g, (letter) =>
    letter.toUpperCase()
  );
  return capital;
};

if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}

// Multer setup
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const multerFilter = (req, file, callback) => {
  console.log(file.mimetype);
  if (file.mimetype.startsWith("image")) {
    callback(null, true);
  } else {
    callback(new AppError("Not an image! Please upload an image", 400), false);
  }
};

exports.upload = multer({
  storage: storage,
  fileFilter: multerFilter,
});

const uploadToCloudinary = async (localFilePath, req) => {
  try {
    console.log(localFilePath);

    const myCloud = await cloudinary.v2.uploader.upload(localFilePath, {
      folder: "images",
      width: 150,
      crop: "scale",
    });
    fs.unlinkSync(localFilePath);
    return {
      message: "Success",
      url: myCloud.secure_url,
    };

    // throw new Error("Error");
  } catch (err) {
    fs.unlinkSync(localFilePath);
    console.log(err);
    throw err;
  }
};

exports.uploadPics = async (req, res, next) => {
  try {
    if (req.files) {
      console.log(req.files);
      const promises = [];
      const maxRetries = 3; // Maximum number of upload retries
      const retryDelay = 1000; // Delay between retries in milliseconds

      for (let i = 0; i < req.files.length; i++) {
        const localFilePath = "./uploads/" + req.files[i].originalname;
        promises.push(
          uploadToCloudinaryWithRetries(
            localFilePath,
            req,
            maxRetries,
            retryDelay
          )
        );
      }

      const results = await Promise.all(promises);
      const imageUrlList = results.map((result) => result.url);
      req.body.images = imageUrlList;
    }
    next();
    // const newPg = await Pg.create(req.body);
    // // console.log(newPg);
    // res.status(201).json({
    //   status: "success",
    //   data: {
    //     Pg: newPg,
    //   },
    // });
  } catch (err) {
    next();
  }
};

const uploadToCloudinaryWithRetries = async (
  localFilePath,
  req,
  maxRetries,
  retryDelay
) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      const result = await uploadToCloudinary(localFilePath, req);
      return result;
    } catch (err) {
      retries++;
      console.error(`Upload attempt ${retries} failed: ${err}`);
      await wait(retryDelay);
    }
  }
  throw new Error(`Failed to upload Pictures. Please try again!!`);
};

const wait = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// exports.uploadPics = async (req, res, next) => {
//   try {
//     if (req.files) {
//       console.log(req.files);
//       const promises = [];

//       for (let i = 0; i < req.files.length; i++) {
//         const localFilePath = "./uploads/" + req.files[i].originalname;
//         promises.push(uploadToCloudinary(localFilePath, req));
//       }

//       const results = await Promise.all(promises);
//       const imageUrlList = results.map((result) => result.url);
//       req.body.images = imageUrlList;
//     }
//     const newPg = await Pg.create(req.body);
//     // console.log(newPg);
//     res.status(201).json({
//       status: "success",
//       data: {
//         Pg: newPg,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };
//
//
//
//
exports.getAllPgs = async (req, res, next) => {
  // const pgs = await Pg.find(req.query);
  try {
    const queryObj = { ...req.query };
    const excludedFields = ["sort", "page", "fields", "limit"];
    excludedFields.forEach((el) => {
      delete queryObj[el];
    });

    let queryString = JSON.stringify(queryObj);
    queryString = queryString.replace(
      /\b(lt|lte|gt|gte)\b/g,
      (match) => `$${match}`
    );
    let query = Pg.find(JSON.parse(queryString));

    //SORTING
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("createdAt");
    }

    //PAGINATION
    const page = req.query.page * 1 || 1;
    const limit = req.query.limit * 1 || 20;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);
    query.select("-location -sharing");

    const pgs = await query;

    // console.log(req.query);
    res.status(200).json({
      status: "success",
      results: pgs.length,
      data: {
        pgs: pgs,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getPgById = async (req, res, next) => {
  try {
    const pg = await Pg.findById(req.params.id).populate({
      path: "reviews",
      select: "review rating user -pg -_id",
    });
    if (!pg) return next(new AppError("No document found with that id", 404));
    res.status(200).json({
      status: "success",
      data: {
        pg: pg,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.createPgDoc = async (req, res, next) => {
  try {
    req.body.pgAmenities = JSON.parse(req.body.pgAmenities);
    req.body.sharing = JSON.parse(req.body.sharing);
    req.body.address = JSON.parse(req.body.address);
    req.body.pgContactInfo = JSON.parse(req.body.pgContactInfo);
    req.body.pgRules = JSON.parse(req.body.pgRules);
    req.body.noticePeriodDays = req.body.noticePeriodDays * 1;
    req.body.securityDeposit = req.body.securityDeposit * 1;
    req.body.address.pincode = req.body.address.pincode * 1;
    // To capitalize each word
    req.body.name = capitalizeEachWord(req.body.name);
    req.body.address.locality = capitalizeEachWord(req.body.address.locality);

    // console.log(req.body);
    prices = req.body.sharing.map((el) => el.price);
    req.body.minPrice = Math.min(...prices);
    req.body.maxPrice = Math.max(...prices);
    req.body.pgOwner = req.body.userID;
    req.body.address.locality = req.body.address.locality.toLowerCase();
    req.body.address.city = req.body.address.city.toLowerCase();
    req.body.address.state = req.body.address.state.toLowerCase();
    // req.body.pgType = req.body.pgType.toLowerCase();
    console.log(req.body);

    // const newPg = await Pg.create(req.body);
    // res.status(201).json({
    //   status: "success",
    //   data: {
    //     Pg: newPg,
    //   },
    // });
    next();
  } catch (err) {
    next(err);
  }
};

exports.createPg = async (req, res, next) => {
  try {
    const newPg = await Pg.create(req.body);

    const response = {
      status: "success",
      data: {
        Pg: newPg,
      },
    };
    if (req.files && !req.body.images) {
      response.status = "imageUploadFailed";
    }
    // console.log(newPg);
    res.status(201).json(response);
  } catch (err) {
    next(err);
  }
};

exports.updatePgById = async (req, res, next) => {
  try {
    req.body.updated = Date.now();
    const pg = await Pg.findOneAndUpdate(
      { _id: req.params.id, pgOwner: req.user._id },
      req.body,
      {
        runValidators: true,
        new: true,
      }
    );

    if (!pg) return next(new AppError("Invalid Request", 400));

    res.status(200).json({
      status: "success",
      data: {
        pg: pg,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deletePgById = async (req, res, next) => {
  try {
    const pg = await Pg.findOneAndDelete({
      _id: req.params.id,
      pgOwner: req.user._id,
    });

    if (!pg) return next(new AppError("Invalid Request", 400));

    res.status(204).json({
      status: "success",
    });
  } catch (err) {
    next(err);
  }
};

exports.searchPg = async (req, res, next) => {
  try {
    console.log(req.body);
    let queryObj = {};
    if (req.body.city) {
      queryObj["address.city"] = req.body.city.toLowerCase();
    }
    // queryObj = {
    //   "address.city": req.body.city.toLowerCase(),
    // };
    //"pgAmenities.wifi": true, "pgAmenities.parking": true }
    if (req.body.amenities && req.body.amenities.length > 0) {
      req.body.amenities.forEach((el) => {
        queryObj[`pgAmenities.${el}`] = true;
      });
    }
    if (req.body.rules) {
      req.body.rules.forEach((el) => {
        queryObj[`pgRules.${el}`] = true;
      });
    }

    //{ pgType: { $in: ["male", "female", "mixed"] } }
    if (req.body.pgType && req.body.pgType.length > 0) {
      queryObj.pgType = { $in: req.body.pgType };
    }
    if (req.body.food) {
      queryObj.food = { $in: req.body.food };
    }
    //{ 'sharing.occupancy': { $in: [2, 3, 4] } }
    if (req.body.sharing && req.body.sharing.length > 0) {
      req.body.sharing = req.body.sharing.map((el) => el * 1);
      queryObj["sharing.occupancy"] = { $in: req.body.sharing };
    }

    //{$and: [{ minPrice: { $gte: 5000 } }, { maxPrice: { $lte: 7500 } }],
    if (req.body.price && req.body.price.length > 0) {
      queryObj.$and = [
        { minPrice: { $gte: req.body.price[0] } },
        { maxPrice: { $lte: req.body.price[1] } },
      ];
    }

    console.log(req.body);
    console.log(queryObj);

    let query = Pg.find(queryObj);

    //SORTING
    query = query.sort({ minPrice: req.body.sort || 1 });
    //PAGINATION
    // const page = req.query.page * 1 || 1;
    // const limit = req.query.limit * 1 || 50;
    // const skip = (page - 1) * limit;
    // query = query.skip(skip).limit(limit);

    pgs = await query;

    // console.log(pgs);
    res.status(200).json({
      status: "success",
      results: pgs.length,
      data: {
        pgs: pgs,
      },
    });
  } catch (err) {
    next(err);
  }
};
