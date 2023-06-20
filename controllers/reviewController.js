const express = require("express");
const AppError = require("./../utils/appError");

const Review = require("./../models/reviewmodel");

exports.getAllReviews = async (req, res, next) => {
  try {
    let filter = {};
    if (req.params.pgId) filter = { pg: req.params.pgId };
    const reviews = await Review.find(filter);

    if (!reviews) return next(new AppError("No review found"));

    res.status(200).json({
      status: "success",
      results: reviews.length,
      data: {
        reviews,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.createReview = async (req, res, next) => {
  try {
    req.body.pg = req.params.pgId;
    req.body.user = req.user._id;
    const newReview = await Review.create(req.body);
    res.status(201).json({
      status: "success",
      data: {
        review: newReview,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review)
      return next(new AppError("No document found with that id", 404));
    res.status(200).json({
      status: "success",
      data: {
        review: review,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.updateReviewById = async (req, res, next) => {
  try {
    req.body.updated = Date.now();
    const review = await Review.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { runValidators: true, new: true }
    );

    if (!review) return next(new AppError("Invalid Request", 400));

    res.status(200).json({
      status: "success",
      data: {
        review: review,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteReviewById = async (req, res, next) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!review) return next(new AppError("Invalid Request", 400));

    res.status(204).json({
      status: "success",
    });
  } catch (err) {
    next(err);
  }
};
