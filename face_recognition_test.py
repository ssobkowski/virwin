import asyncio
import struct
import threading
import time

import cv2
import mediapipe as mp
import numpy as np
import websockets
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from visualizer import visualize

CAM_OFFSET = (0, 0)  # cm

Z_COEFF = 17000
XY_COEFF = 1

latest_coords = {"x": 0, "y": 0, "z": 0}


def encode_coords() -> bytes:
    return struct.pack(
        "ddd", latest_coords["x"], latest_coords["y"], latest_coords["z"]
    )


async def websocket_handler(websocket):
    print("Client connected")
    try:
        while True:
            await websocket.send(encode_coords())
            await asyncio.sleep(0.016)
    except websockets.ConnectionClosed:
        print("Client disconnected")


def start_server():
    async def main():
        print("Starting WebSocket server on ws://localhost:8765")
        async with websockets.serve(websocket_handler, "localhost", 8765):
            await asyncio.Future()

    asyncio.run(main())


def calc_coordinates(result, img_size: tuple[int, int]) -> tuple[float, float, float]:
    if not result.detections:
        return 0, 0, 0

    detection = result.detections[0]
    keypoints = detection.keypoints
    left_eye = keypoints[0]
    right_eye = keypoints[1]
    bbox = detection.bounding_box

    eye_center_flat_px = (
        (left_eye.x + right_eye.x) / 2,
        (left_eye.y + right_eye.y) / 2,
    )

    face_size_cooef = bbox.width + bbox.height

    z = Z_COEFF / face_size_cooef
    x = (eye_center_flat_px[0] - 0.5) * z * XY_COEFF + CAM_OFFSET[0]
    y = (eye_center_flat_px[1] - 0.5) * z * XY_COEFF + CAM_OFFSET[1]

    return x, y, z


def process_detection(result, frame, timestamp_ms):
    """Process detection result and display on frame."""
    global latest_coords
    try:
        image_copy = np.copy(frame)
        annotated_image = visualize(image_copy, result)

        cv2.putText(
            annotated_image,
            f"Time: {timestamp_ms}ms",
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 255, 0),
            1,
        )

        if result.detections:
            x, y, z = calc_coordinates(result, (frame.shape[1], frame.shape[0]))

            latest_coords = {"x": x, "y": y, "z": z}

            cv2.putText(
                annotated_image,
                f"X: {x:.0f}cm Y: {y:.0f}cm Z: {z:.0f}cm",
                (10, 70),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                1,
            )

        cv2.imshow("Webcam", annotated_image)
        cv2.waitKey(1)
    except Exception as e:
        print(f"Error in detection: {e}")


server_thread = threading.Thread(target=start_server, daemon=True)
server_thread.start()

print("Inicjalizacja detektora...")
base_options = python.BaseOptions(model_asset_path="./blaze_face_short_range.tflite")
options = vision.FaceDetectorOptions(
    base_options=base_options, running_mode=vision.RunningMode.VIDEO
)

detector = vision.FaceDetector.create_from_options(options)
print("Detektor utworzony!")

print("Otwieranie kamery...")
# Użyj CAP_DSHOW na Windows dla lepszej wydajności
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("BŁĄD: Nie można otworzyć kamery!")
    exit(1)

print("Kamera otwarta! Uruchamianie pętli...")

stream_start_ts = time.perf_counter()

try:
    while True:
        ret, frame = cap.read()
        if not ret:
            print("BŁĄD: Nie można odczytać klatki!")
            break

        frame = cv2.flip(frame, 1)

        # Bezpośrednia konwersja bez pośredniej zmiennej
        image = mp.Image(
            image_format=mp.ImageFormat.SRGB,
            data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB),
        )

        current_ts = int((time.perf_counter() - stream_start_ts) * 1000)
        result = detector.detect_for_video(image, current_ts)

        # Przetwórz wynik bezpośrednio
        process_detection(result, frame, current_ts)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            print("Zamykanie...")
            break

except KeyboardInterrupt:
    print("Przerwano przez użytkownika")
except Exception as e:
    print(f"Błąd w głównej pętli: {e}")
finally:
    cap.release()
    cv2.destroyAllWindows()
    print("Zakończono")
