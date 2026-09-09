import cv2
import os
import numpy as np
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def detect_image_in_video(image_path, video_path, progress_callback=None, match_threshold=0.6):
    """
    Detects occurrences of a reference image in a video and saves detected regions at most once per second.
    Args:
        image_path (str): Path to the reference image.
        video_path (str): Path to the video file.
        progress_callback (callable, optional): Function to call with progress (0-1).
        match_threshold (float, optional): Similarity threshold (0.0 to 1.0). Defaults to 0.6.

    Returns:
        tuple: (bool, list, dict)
            - True if any match is found, False otherwise.
            - List of timestamps (in seconds) where the image was detected.
            - Dictionary mapping timestamps to paths of saved detected image regions.
    """
    # Load reference image
    reference_image = cv2.imread(image_path)
    if reference_image is None:
        logger.error(f"Could not load reference image from {image_path}")
        return False, [], {}

    reference_image_gray = cv2.cvtColor(reference_image, cv2.COLOR_BGR2GRAY)
    h, w = reference_image_gray.shape[:2]
    logger.info(f"Reference image loaded: {image_path}, size: {w}x{h}")

    # Open video file
    video_capture = cv2.VideoCapture(video_path)
    if not video_capture.isOpened():
        logger.error(f"Could not open video file from {video_path}")
        return False, [], {}

    fps = video_capture.get(cv2.CAP_PROP_FPS)
    total_frames = int(video_capture.get(cv2.CAP_PROP_FRAME_COUNT))
    logger.info(f"Video loaded: {video_path}, FPS: {fps}, Total frames: {total_frames}")

    timestamps = []
    detected_image_output_paths = {}
    found_match = False
    output_dir = "temp_detected_images"
    os.makedirs(output_dir, exist_ok=True)
    last_saved_time = -1.0  # Track last saved timestamp (initialize to allow first detection)

    # Define scales for scale-invariant matching
    scales = [0.5, 0.75, 1.0, 1.25, 1.5]

    frame_count = 0
    while video_capture.isOpened():
        ret, frame = video_capture.read()
        if not ret:
            break

        frame_count += 1
        current_time_seconds = frame_count / fps
        if progress_callback:
            progress_callback(min(frame_count / total_frames, 1.0))

        frame_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # Try multiple scales
        best_max_val = -1
        best_loc = None
        best_scale = 1.0
        for scale in scales:
            scaled_ref = cv2.resize(reference_image_gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
            if scaled_ref.shape[0] > frame_gray.shape[0] or scaled_ref.shape[1] > frame_gray.shape[1]:
                continue
            result = cv2.matchTemplate(frame_gray, scaled_ref, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(result)
            if max_val > best_max_val:
                best_max_val = max_val
                best_loc = max_loc
                best_scale = scale

        logger.debug(f"Frame {frame_count} ({current_time_seconds:.2f}s): max_val={best_max_val:.4f}, scale={best_scale}")

        if best_max_val >= match_threshold:
            found_match = True
            # Only save if at least 1 second has passed since the last saved detection
            if current_time_seconds >= last_saved_time + 1.0:
                timestamps.append(current_time_seconds)
                scaled_w, scaled_h = int(w * best_scale), int(h * best_scale)
                top_left = best_loc
                bottom_right = (top_left[0] + scaled_w, top_left[1] + scaled_h)
                detected_region = frame[top_left[1]:bottom_right[1], top_left[0]:bottom_right[0]]
                output_filename = os.path.join(output_dir, f"detected_at_{int(current_time_seconds)}s_frame_{frame_count}.jpg")
                cv2.imwrite(output_filename, detected_region)
                detected_image_output_paths[current_time_seconds] = output_filename
                last_saved_time = current_time_seconds
                logger.info(f"Match found and saved at {current_time_seconds:.2f}s, path: {output_filename}")
            else:
                logger.debug(f"Match found at {current_time_seconds:.2f}s but skipped (within 1s of last save)")

    video_capture.release()
    logger.info(f"Detection complete: found_match={found_match}, timestamps={timestamps}")
    return found_match, timestamps, detected_image_output_paths

if __name__ == '__main__':
    sample_image_path = "sample_image.jpg"
    sample_video_path = "sample_video.mp4"

    logger.info(f"Testing detection with {sample_image_path} in {sample_video_path}")

    if not os.path.exists(sample_image_path):
        logger.info(f"Creating dummy image: {sample_image_path}")
        dummy_img = np.zeros((100, 100, 3), dtype=np.uint8)
        cv2.putText(dummy_img, "TEST", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        cv2.imwrite(sample_image_path, dummy_img)

    if not os.path.exists(sample_video_path):
        logger.info(f"Creating dummy video: {sample_video_path}")
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out = cv2.VideoWriter(sample_video_path, fourcc, 20.0, (640, 480))
        for i in range(100):
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, f"Frame {i}", (50, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
            if i % 10 == 0:
                frame[100:200, 100:200] = cv2.imread(sample_image_path)
            out.write(frame)
        out.release()

    has_match, timestamps, detected_paths = detect_image_in_video(
        sample_image_path, sample_video_path, progress_callback=lambda p: logger.info(f"Progress: {p:.2f}")
    )

    if has_match:
        logger.info("\n--- Detection Results ---")
        logger.info(f"Image found: {has_match}")
        logger.info(f"Timestamps: {timestamps}")
        logger.info("Detected Image Paths:")
        for ts, path in detected_paths.items():
            logger.info(f"  - At {ts:.2f}s: {path}")
    else:
        logger.info("Image not found in the video.")