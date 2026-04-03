"""OpenCV + MediaPipe Tasks hand detection demo.

Run:
    python backend/tools/hand_detection_cv2.py

Keys:
    q -> quit
"""

from __future__ import annotations

import time
import urllib.request
from dataclasses import dataclass
from typing import Any
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision


MODEL_URL = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
MODEL_PATH = Path(__file__).with_name("hand_landmarker.task")


@dataclass
class HandState:
    pinch: bool = False
    pinch_distance: float = 0.0


def euclidean(a: tuple[float, float], b: tuple[float, float]) -> float:
    dx = a[0] - b[0]
    dy = a[1] - b[1]
    return (dx * dx + dy * dy) ** 0.5


def ensure_model() -> Path:
    if MODEL_PATH.exists():
        return MODEL_PATH

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)
    return MODEL_PATH


def build_landmarker() -> Any:
    model_path = ensure_model()
    base_options = mp_python.BaseOptions(model_asset_path=str(model_path))
    options = mp_vision.HandLandmarkerOptions(
        base_options=base_options,
        num_hands=1,
        min_hand_detection_confidence=0.5,
        min_hand_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        running_mode=mp_vision.RunningMode.VIDEO,
    )
    return mp_vision.HandLandmarker.create_from_options(options)


def run_hand_detection(camera_index: int = 0) -> None:
    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        raise RuntimeError("Unable to open webcam. Check camera permissions and camera index.")

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    landmarker = build_landmarker()

    state = HandState()
    fps_start = time.time()
    frame_count = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        frame = cv2.flip(frame, 1)
        h, w, _ = frame.shape

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        timestamp_ms = int(time.time() * 1000)
        result = landmarker.detect_for_video(mp_image, timestamp_ms)

        status = "No hand"
        state.pinch = False
        state.pinch_distance = 0.0

        if result.hand_landmarks:
            landmarks = result.hand_landmarks[0]
            points = [(int(lm.x * w), int(lm.y * h)) for lm in landmarks]

            for connection in mp_vision.HandLandmarksConnections.HAND_CONNECTIONS:
                start_idx = connection.start
                end_idx = connection.end
                cv2.line(frame, points[start_idx], points[end_idx], (255, 180, 0), 2)

            for px in points:
                cv2.circle(frame, px, 3, (0, 255, 255), -1)

            thumb_tip = landmarks[4]
            index_tip = landmarks[8]

            thumb_px = (int(thumb_tip.x * w), int(thumb_tip.y * h))
            index_px = (int(index_tip.x * w), int(index_tip.y * h))

            cv2.circle(frame, thumb_px, 8, (255, 50, 50), -1)
            cv2.circle(frame, index_px, 8, (50, 255, 50), -1)
            cv2.line(frame, thumb_px, index_px, (255, 255, 0), 2)

            state.pinch_distance = euclidean((thumb_tip.x, thumb_tip.y), (index_tip.x, index_tip.y))
            state.pinch = state.pinch_distance < 0.09
            status = "Pinch detected" if state.pinch else "Hand detected"

        frame_count += 1
        now = time.time()
        elapsed = max(now - fps_start, 1e-6)
        fps = frame_count / elapsed

        cv2.putText(frame, f"Status: {status}", (18, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.85, (255, 255, 255), 2)
        cv2.putText(frame, f"Pinch distance: {state.pinch_distance:.3f}", (18, 66), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (220, 220, 220), 2)
        cv2.putText(frame, f"FPS: {fps:.1f}", (18, 98), cv2.FONT_HERSHEY_SIMPLEX, 0.75, (220, 220, 220), 2)

        cv2.imshow("EducoLink CV2 Hand Detection", frame)

        key = cv2.waitKey(1) & 0xFF
        if key == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()
    landmarker.close()


if __name__ == "__main__":
    run_hand_detection()
