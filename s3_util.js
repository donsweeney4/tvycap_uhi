// s3_utils.js -- utility to get presigned S3 URLs

export async function getPresignedS3Url(filename) {
  // Define requestBody BEFORE logging it
  const requestBody = JSON.stringify({ filename });

  // --- ADD THESE LOGS FOR DEBUGGING ---
  console.log("DEBUG: Fetch URL:", 'http://mobile.quest-science.net/get_presigned_url'); // Note: was 'http' in your snippet
  console.log("DEBUG: Fetch Method:", 'POST');
  console.log("DEBUG: Fetch Headers:", { 'Content-Type': 'application/json' });
  console.log("DEBUG: Fetch Body (stringified):", requestBody);
  // --- END DEBUG LOGS ---

  try {
    // Ensure the URL is correct (http vs https)
    const response = await fetch('https://mobile.quest-science.net/get_presigned_url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody, // Use the defined requestBody here
    });

    if (!response.ok) {
      // It's good practice to try to read the error body even if not .json()
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
    console.error('❌ Error fetching presigned S3 URL:', err);
    throw err;
  }
}