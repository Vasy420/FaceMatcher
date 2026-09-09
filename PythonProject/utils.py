import io
import logging
import tempfile
import os
from PIL import Image
import cv2
import numpy as np

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def validate_image(image_file):
    """
    Validate if the uploaded file is a valid image for processing.

    Args:
        image_file: Streamlit file uploader object

    Returns:
        bool: True if valid, False otherwise
    """
    try:
        # Read and verify image with PIL
        img = Image.open(image_file)
        img.verify()  # Verify image integrity
        image_file.seek(0)  # Reset file pointer

        # Check format
        if img.format.lower() not in ['jpeg', 'jpg', 'png']:
            logger.error(f"Invalid image format for {image_file.name}: {img.format}")
            return False

        # Check dimensions
        img = Image.open(image_file)
        width, height = img.size
        if width < 50 or height < 50 or width > 4000 or height > 4000:
            logger.error(f"Invalid image dimensions for {image_file.name}: {width}x{height}")
            return False

        # Verify OpenCV can read the image
        img_array = np.array(img)
        img_cv = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
        if img_cv is None:
            logger.error(f"OpenCV failed to load image {image_file.name}")
            return False

        image_file.seek(0)  # Reset file pointer
        logger.info(f"Image validated: {image_file.name}, {width}x{height}, format: {img.format}")
        return True

    except Exception as e:
        logger.error(f"Image validation failed for {image_file.name}: {str(e)}")
        return False

def validate_video(video_file):
    """
    Validate if the uploaded file is a valid video for processing.

    Args:
        video_file: Streamlit file uploader object

    Returns:
        bool: True if valid, False otherwise
    """
    temp_filename = None
    try:
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{video_file.name.split('.')[-1]}") as tmp:
            tmp.write(video_file.getvalue())
            temp_filename = tmp.name

        # Verify OpenCV can open the video
        cap = cv2.VideoCapture(temp_filename)
        if not cap.isOpened():
            logger.error(f"OpenCV failed to open video {video_file.name}")
            return False

        # Check video metadata
        fps = cap.get(cv2.CAP_PROP_FPS)
        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if fps <= 0 or frame_count <= 0:
            logger.error(f"Invalid video metadata for {video_file.name}: FPS={fps}, Frames={frame_count}")
            cap.release()
            os.unlink(temp_filename)
            return False

        # Check duration (max 10 minutes)
        duration = frame_count / fps
        if duration > 600:  # 10 minutes in seconds
            logger.error(f"Video too long: {video_file.name}, duration={duration}s")
            cap.release()
            os.unlink(temp_filename)
            return False

        cap.release()
        os.unlink(temp_filename)
        video_file.seek(0)  # Reset file pointer
        logger.info(f"Video validated: {video_file.name}, duration={duration}s, FPS={fps}, frames={frame_count}")
        return True

    except Exception as e:
        logger.error(f"Video validation failed for {video_file.name}: {str(e)}")
        if temp_filename and os.path.exists(temp_filename):
            try:
                os.unlink(temp_filename)
            except Exception as cleanup_error:
                logger.warning(f"Failed to clean up {temp_filename}: {str(cleanup_error)}")
        return False