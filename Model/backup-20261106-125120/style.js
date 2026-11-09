async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 640, height: 480 },
    audio: false
  });

  const video = document.querySelector("#camera");
  video.srcObject = stream;
  await video.play();
}
