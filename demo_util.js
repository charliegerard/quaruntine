const color = "aqua";
const boundingBoxColor = "red";

function drawPoint(ctx, y, x, r, color) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }

    const { y, x } = keypoint.position;

    // console.log(keypoint);
    // if(keypoint.part === 'leftWrist'){
    //   const leftElbow = key
    //   if(keypoint.position.y < )
    // }

    // let panOffset = [0, 0];

    // if (x > window.innerWidth / 2) {
    //   panOffset[0] = 150;
    // }

    // if (x < window.innerWidth / 2) {
    //   panOffset[0] = -150;
    // }

    // if (y < window.innerHeight / 3) {
    //   panOffset[1] = -150;
    // }

    // if (y > window.innerHeight / 3) {
    //   panOffset[1] = 150;
    // }

    drawPoint(ctx, y * scale, x * scale, 3, color);

    // map.panBy(panOffset);
  }
}
