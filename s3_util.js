// s3_util.js -- utility to get presigned S3 URLs

export async function getPresignedS3Url(filename, bucketName) { // --- MODIFIED ---
  
  // ---  Add bucketName to the request body ---
  const requestBody = JSON.stringify({ 
    filename: filename, 
    bucket: bucketName  // You can name this key whatever your server expects
  });

  // --- ADD THESE LOGS FOR DEBUGGING ---
  console.log("");
  console.log("DEBUG: Preparing to fetch presigned S3 URL with the following details:");
  console.log("DEBUG: Filename:", filename);
  console.log("DEBUG: Bucket Name:", bucketName);
  console.log("DEBUG: Fetch URL:", 'https://mobile.quest-science.net/get_presigned_url');
  console.log("DEBUG: Fetch Method:", 'POST');
  console.log("DEBUG: Fetch Headers:", { 'Content-Type': 'application/json' });
  console.log("DEBUG: Fetch Body (stringified):", requestBody); //
  console.log(""); 
  // --- END DEBUG LOGS --

  try {
    const response = await fetch('https://mobile.quest-science.net/get_presigned_url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody, // Use the defined requestBody here
    });

    if (!response.ok) {
      // ... (error handling code remains the same) ...
      let errorDetails = `Server error: ${response.status}`;
      try {
        const errorJson = await response.json();
        errorDetails = `Server error: ${response.status} - ${errorJson.error || JSON.stringify(errorJson)}`;
      } catch (parseErr) {
        const rawText = await response.text();
        errorDetails = `Server error: ${response.status} - Raw response: ${rawText}`;
      }
      throw new Error(errorDetails);
    }

    const data = await response.json();
    return {
      uploadUrl: data.uploadUrl,
      publicUrl: data.publicUrl,
    };
  } catch (err) { 
  // Use 'err' to log the error
  console.error("❌ FAILED TO GET PRESIGNED URL:", err.message); 
  
  // Also log the original console.error you had (it was correct)
  console.error('❌ Error fetching presigned S3 URL:', err);
  throw err; 
}
}