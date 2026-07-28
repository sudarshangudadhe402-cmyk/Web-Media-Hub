import mongoose from "mongoose";
const S = new mongoose.Schema({ publicSlug: String, name: String, ownerId: String, isLocked: Boolean }, { strict: false });
const Store = mongoose.model("Store", S);
await mongoose.connect(process.env.MONGODB_URI);
const stores = await Store.find({}).lean();
stores.forEach(s => console.log(JSON.stringify({ id: String(s._id), name: s.name, publicSlug: s.publicSlug, ownerId: s.ownerId ?? null, isLocked: s.isLocked })));
await mongoose.disconnect();
