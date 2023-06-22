const mongoose = require("mongoose");
const Pg = require("./pgmodel.js");

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, "Review can not be empty"],
    },
    rating: {
      type: Number,
      max: 5,
      min: 1,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    pg: {
      type: mongoose.Schema.ObjectId,
      ref: "Pg",
      required: [true, "Review must belong to a Pg"],
    },
    updated: {
      type: Date,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a User"],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    id: false,
  }
);

reviewSchema.index({ pg: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name",
  });
  next();
});

reviewSchema.statics.calcAverageRatings = async function (pgId) {
  const stats = await this.aggregate([
    {
      $match: { pg: pgId },
    },
    {
      $group: {
        _id: "$pg",
        nRating: { $sum: 1 },
        avgRating: { $avg: "$rating" },
      },
    },
  ]);
  if (stats.length > 0) {
    await Pg.findByIdAndUpdate(pgId, {
      //*update data in Pg model
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  }
  console.log(stats);
  //   else {
  //     await Tour.findByIdAndUpdate(tourId, {
  //       //*update data in Tour model
  //       ratingsAverage: 4.5,
  //       ratingsQuantity: 0,
  //     });
  //   }
};

reviewSchema.post("save", function () {
  this.constructor.calcAverageRatings(this.pg);
});

//todo To update review stats on Updating and Deleting reviews
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.model.find(this._conditions);
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  console.log(this.r);
  if (this.r.length > 0)
    await this.r[0].constructor.calcAverageRatings(this.r[0].pg);
});

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;
