import { GifParser } from '../src';

document.getElementById('image-select')!.addEventListener('change', e => {
  const files = (e.target as HTMLInputElement).files;
  if (!files) {
    return;
  }
  const imageFile = files[0];

  const fileReader = new FileReader();
  fileReader.readAsDataURL(imageFile);
  fileReader.onload = () => {
    const result = fileReader.result as string;
    const originGIf = document.getElementById('origin-gif') as HTMLImageElement;
    originGIf.src = result;

    fetch(result)
      .then(res => res.arrayBuffer())
      .then(arrayBuffer => {
        const frameImageList = document.getElementById('frame-image-list') as HTMLDivElement;
        const canvas = document.createElement('canvas');
        const canvasCtx = canvas.getContext('2d') as CanvasRenderingContext2D;

        const { width, height, frames } = GifParser(arrayBuffer);
        const imageList = frames.map(frame => {
          const imageData = new ImageData(frame.pixelData, width, height);

          canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
          canvas.width = width;
          canvas.height = height;
          canvasCtx!.putImageData(imageData, 0, 0);

          const imageUrl = canvas.toDataURL('image/png', 1);
          const image = document.createElement('img');
          image.src = imageUrl;
          return image;
        });

        frameImageList.append(...imageList);
      });
  };
});
