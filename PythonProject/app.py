import streamlit as st
import tempfile
import os
from PIL import Image
import logging
from utils import validate_image, validate_video
from image_detector import detect_image_in_video

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set page configuration
st.set_page_config(
    page_title="Image in Video Detector",
    page_icon="🔍",
    layout="wide"
)

# Initialize session state
if 'stage' not in st.session_state:
    st.session_state.stage = 'home'  # Stages: home, upload, processing, results
if 'results' not in st.session_state:
    st.session_state.results = None
if 'timestamps' not in st.session_state:
    st.session_state.timestamps = []
if 'image_file' not in st.session_state:
    st.session_state.image_file = None
if 'video_file' not in st.session_state:
    st.session_state.video_file = None
if 'detected_face_paths' not in st.session_state:
    st.session_state.detected_face_paths = {}

def reset_app():
    """Reset session state to initial values."""
    st.session_state.stage = 'home'
    st.session_state.results = None
    st.session_state.timestamps = []
    st.session_state.image_file = None
    st.session_state.video_file = None
    st.session_state.detected_face_paths = {}
    logger.info("App reset to home stage")

def start_app():
    """Transition to upload stage."""
    st.session_state.stage = 'upload'
    logger.info("Transitioned to upload stage")

def process_files():
    """Transition to processing stage if files are uploaded."""
    if st.session_state.image_file and st.session_state.video_file:
        st.session_state.stage = 'processing'
        logger.info("Transitioned to processing stage")
        st.rerun()

# Home page
if st.session_state.stage == 'home':
    st.title("Face Matcher")
    st.markdown("""
    ### Welcome!
    This application detects if an image appears in a video.
    Upload your image and video to locate all instances of the image.

    ### How it works:
    1. Click Start to begin
    2. Upload a reference image and video file
    3. The system processes the video to find the image
    4. View results showing when and where the image appears
    """)
    st.button("Start", on_click=start_app, use_container_width=True)

# Upload page
elif st.session_state.stage == 'upload':
    st.title("Upload Files")

    # Upload image
    st.subheader("Upload Reference Image")
    image_file = st.file_uploader("Choose an image (JPG, PNG)", type=['jpg', 'jpeg', 'png'])
    if image_file:
        if validate_image(image_file):
            st.session_state.image_file = image_file
            st.success("Image uploaded successfully!")
            st.image(image_file, caption="Reference Image", width=300)
            logger.info(f"Image uploaded: {image_file.name}")
        else:
            st.error("Invalid image file. Please upload a valid JPG or PNG (50x50 to 4000x4000 pixels).")
            st.session_state.image_file = None
            logger.error(f"Invalid image: {image_file.name}")

    # Upload video
    st.subheader("Upload Video")
    video_file = st.file_uploader("Choose a video (MP4, AVI, max 10 min)", type=['mp4', 'avi'])
    if video_file:
        if validate_video(video_file):
            st.session_state.video_file = video_file
            st.success("Video uploaded successfully!")
            st.info(f"Filename: {video_file.name}")
            st.video(video_file)
            logger.info(f"Video uploaded: {video_file.name}")
        else:
            st.error("Invalid video file. Please upload a valid MP4 or AVI (max 10 min).")
            st.session_state.video_file = None
            logger.error(f"Invalid video: {video_file.name}")

    # Process button
    if st.session_state.image_file and st.session_state.video_file:
        st.button("Process Files", on_click=process_files, use_container_width=True)
    else:
        st.button("Process Files", disabled=True, help="Upload both image and video", use_container_width=True)

    st.button("Back", on_click=reset_app)

# Processing page
elif st.session_state.stage == 'processing':
    st.title("Processing...")
    progress_bar = st.progress(0)
    status_text = st.empty()

    try:
        # Create temporary files
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{st.session_state.image_file.name.split('.')[-1]}") as tmp_img:
            tmp_img.write(st.session_state.image_file.getvalue())
            img_path = tmp_img.name

        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{st.session_state.video_file.name.split('.')[-1]}") as tmp_vid:
            tmp_vid.write(st.session_state.video_file.getvalue())
            vid_path = tmp_vid.name

        # Debug file paths
        logger.info(f"Temp image path: {img_path}, exists: {os.path.exists(img_path)}")
        logger.info(f"Temp video path: {vid_path}, exists: {os.path.exists(vid_path)}")

        def progress_callback(progress):
            progress_bar.progress(min(progress, 1.0))
            status_text.text(f"Processing: {int(progress * 100)}% complete")

        has_match, timestamps, detected_face_paths = detect_image_in_video(img_path, vid_path, progress_callback)

        # Clean up temporary files
        os.unlink(img_path)
        os.unlink(vid_path)

        st.session_state.results = has_match
        st.session_state.timestamps = timestamps
        st.session_state.detected_face_paths = detected_face_paths
        st.session_state.stage = 'results'
        logger.info(f"Processing complete: has_match={has_match}, timestamps={timestamps}")
        st.rerun()

    except Exception as e:
        st.error(f"Error during processing: {str(e)}")
        logger.error(f"Processing error: {str(e)}")
        if 'img_path' in locals():
            os.unlink(img_path)
        if 'vid_path' in locals():
            os.unlink(vid_path)
        reset_app()
        st.button("Back to Home", on_click=reset_app)

# Results page
elif st.session_state.stage == 'results':
    st.title("Detection Results")

    if st.session_state.image_file:
        st.subheader("Reference Image")
        st.image(st.session_state.image_file, width=200)

    if st.session_state.results:
        st.success("✅ Image found in video!")
        if st.session_state.timestamps:
            st.subheader(f"Found {len(st.session_state.timestamps)} matches at:")
            cols = st.columns(3)
            for i, timestamp in enumerate(st.session_state.timestamps):
                with cols[i % 3]:
                    mins, secs = divmod(int(timestamp), 60)
                    time_str = f"{mins:02d}:{secs:02d}"
                    st.metric(f"Match #{i + 1}", time_str)
                    if timestamp in st.session_state.detected_face_paths:
                        try:
                            img = Image.open(st.session_state.detected_face_paths[timestamp])
                            st.image(img, caption=f"Detected at {time_str}", width=150)
                        except FileNotFoundError:
                            st.warning(f"Could not find detected image for {time_str}")
                            logger.warning(f"Missing detected image: {st.session_state.detected_face_paths[timestamp]}")

            if st.session_state.video_file:
                st.subheader("Video Preview")
                st.video(st.session_state.video_file)
        else:
            st.info("Image found, but no timestamps recorded.")
    else:
        st.error("❌ Image not found in video.")
        logger.warning("No matches found in video")
        if st.session_state.video_file:
            st.subheader("Video Preview")
            st.video(st.session_state.video_file)

    col1, col2 = st.columns(2)
    with col1:
        st.button("Try Different Files", on_click=lambda: setattr(st.session_state, 'stage', 'upload'))
    with col2:
        st.button("Start Over", on_click=reset_app)

# Footer
st.markdown("---")
st.markdown("Image in Video Detector")