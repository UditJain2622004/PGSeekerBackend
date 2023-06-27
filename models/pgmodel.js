const mongoose = require("mongoose");
const validator = require("validator");
const slugify = require("slugify");

const pgSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "No name given!! Name required"],
      trim: true,
    },
    slug: String,
    images: [String],
    description: {
      type: String,
      required: [true, "No description given!! description required"],
      trim: true,
    },

    address: {
      locality: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: {
        type: String,
        required: true,
        match: [/^[1-9][0-9]{5}$/, "Invalid pincode"],
      },
    },

    // sharing: [
    //   {
    //     occupancy: { type: Number, required: true },
    //     price: { type: Number, required: true },
    //     ac: { type: Boolean, default: false },
    //   },
    // ],

    sharing: {
      type: [
        {
          occupancy: { type: Number, required: true },
          price: { type: Number, required: true },
          ac: { type: Boolean, default: false },
        },
      ],
      validate: {
        validator: function (array) {
          return array.length >= 1;
        },
        message: "At least one sharing element is required.",
      },
      required: true,
    },

    minPrice: { type: Number },
    maxPrice: { type: Number },
    pgType: {
      type: String,
      enum: ["male", "female", "coLiving"],
      required: true,
    },

    food: {
      type: String,
      enum: ["veg", "both"],
      default: "veg",
      // required: true,
    },

    pgContactInfo: {
      phone: {
        type: String,
        required: true,
        match: [/^\d{10}$/, "Invalid phone number"],
      },
      email: {
        type: String,
        lowercase: true,
        validate: [validator.isEmail, "Please provide a valid email"],
      },
    },

    pgOwner: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "PG must belong to a User"],
    },

    pgNearbyPlaces: [
      {
        placeName: { type: String },
        distance: { type: Number },
      },
    ],

    // location: {
    //   type: {
    //     type: String,
    //     default: "Point",
    //     enum: ["Point"],
    //   },
    //   coordinates: [
    //     {
    //       type: Number,
    //       required: true,
    //     },
    //   ],
    // },

    pgAmenities: [
      {
        wifi: { type: Boolean, default: false },
        ac: { type: Boolean, default: false },
        parking: { type: Boolean, default: false },
        laundry: { type: Boolean, default: false },
        cleaning: { type: Boolean, default: false },
        tv: { type: Boolean, default: false },
        fridge: { type: Boolean, default: false },
        tiffin: { type: Boolean, default: false },
        warden: { type: Boolean, default: false },
        microwave: { type: Boolean, default: false },
        lift: { type: Boolean, default: false },
        cctv: { type: Boolean, default: false },
        nonVeg: { type: Boolean, default: false },
        selfCooking: { type: Boolean, default: false },
        attachWashroom: { type: Boolean, default: false },
        wardrobe: { type: Boolean, default: false },
        powerBackup: { type: Boolean, default: false },
        library: { type: Boolean, default: false },
        // add more amenities as needed
      },
    ],
    pgRules: [
      {
        smoking: { type: Boolean, default: false },
        // pets: { type: Boolean, default: false },
        guests: { type: Boolean, default: false },
        loudMusicAllowed: { type: Boolean, default: false },
        alcoholAllowed: { type: Boolean, default: false },
        // hasSecurityDeposit: { type: Boolean, default: false },
        // hasNoticePeriod: { type: Boolean, default: false },
        // hasGateClosingTimes: { type: Boolean, default: false },
        // add more rules as needed
      },
    ],

    // photos: [{ type: String }],
    noticePeriodDays: { type: Number, default: 0 },
    securityDeposit: { type: Number, default: 0 },
    gateClosingTime: { type: String },
    updated: {
      type: Date,
    },
    ratingsAverage: {
      type: Number,
      default: 4,
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    // id: false,
  }
);

pgSchema.pre("save", function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

pgSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "pg",
  localField: "_id", //? "localField" contains how the "pg" field of "review" model is called in this model
});

pgSchema.pre(/^find/, function (next) {
  this.populate({
    path: "pgOwner",
    select: "name email -_id",
  });
  next();
});

// Define the indexes for the PG schema
pgSchema.index({ location: "2dsphere" });

const Pg = mongoose.model("Pg", pgSchema);

module.exports = Pg;
