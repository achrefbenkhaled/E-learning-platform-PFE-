import axios from 'axios';
import pdf from 'pdf-extraction';

/**
 * Extracts text from a PDF given its URL.
 * Handles Google Drive URLs by converting them to direct download links.
 */
export const extractTextFromPdfUrl = async (url) => {
  try {
    let downloadUrl = url;

    // Handle Google Drive URLs
    if (url.includes('drive.google.com')) {
      const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        const fileId = fileIdMatch[1];
        downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
    }

    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Accept': 'application/pdf',
      },
      // Disable some security checks for public drive links if needed, 
      // but usually axios handles direct downloads fine.
    });

    const data = await pdf(response.data);
    return data.text;
  } catch (error) {
    console.error('PDF Extraction Error:', error);
    throw new Error('Failed to extract text from the PDF URL. Please ensure the link is public and accessible.');
  }
};
