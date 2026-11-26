import { v2 as cloudinary } from 'cloudinary';

// Cloudinary media pipeline (doc 16). Everything is gated on the three env
// vars; without them the site keeps working with plain image URLs and the
// upload endpoint answers 503 CLOUDINARY_NOT_CONFIGURED. MongoDB stores
// URLs + public IDs only, never binary media (doc 16).
export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function configure() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

// Upload an in-memory image buffer. Returns the HTTPS URL and public_id
// that get stored on the owning document (banner, later menu items).
export async function uploadImage(buffer, folder = 'freddo') {
  const client = configure();
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => (error ? reject(error) : resolve({ imageUrl: result.secure_url, publicId: result.public_id }))
    );
    stream.end(buffer);
  });
}

// Delete a previously uploaded asset. Best-effort by design: callers log
// failures instead of failing the request, so a Cloudinary hiccup never
// blocks content management.
export async function deleteImage(publicId) {
  if (!publicId || !isCloudinaryConfigured()) return;
  const client = configure();
  await client.uploader.destroy(publicId, { resource_type: 'image' });
}
