import mongoose from 'mongoose';

// Tables (doc 10.1). Seeded, not admin-managed yet: a café edits its floor
// plan rarely, so CRUD waits until it is actually needed (documented lean
// call). Capacity and zone are all the assignment logic reads.
const tableSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true, trim: true },
    capacity: { type: Number, required: true, min: 1, max: 20 },
    zone: { type: String, enum: ['indoor', 'outdoor'], default: 'indoor' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Table = mongoose.model('Table', tableSchema);
export default Table;
