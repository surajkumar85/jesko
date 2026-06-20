import './style.css';

// Total number of frame images: 74 (first scene) + 40 (second scene)
const totalFrames = 114;
const firstSceneFrames = 74;

// Helper to resolve the relative path for each image
const getFramePath = (index: number): string => {
  if (index < firstSceneFrames) {
    const paddedIndex = String(index).padStart(5, '0');
    return `/first_scene/frame_${paddedIndex}.jpg`;
  } else {
    const secondIndex = index - firstSceneFrames;
    const paddedIndex = String(secondIndex).padStart(5, '0');
    return `/second_scene/frame_${paddedIndex}.jpg`;
  }
};

// State variables
const images: HTMLImageElement[] = [];
let loadedCount = 0;
let currentFrameIndex = 0;
let ticking = false;

// DOM Elements
const loader = document.getElementById('loader') as HTMLDivElement;
const loaderPercentage = document.getElementById('loader-percentage') as HTMLSpanElement;
const loaderBar = document.getElementById('loader-bar') as HTMLDivElement;
const track = document.getElementById('hero-scroll-track') as HTMLDivElement;
const canvas = document.getElementById('hero-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const replayBtn = document.getElementById('replay-btn') as HTMLButtonElement;
const aviationOverlay = document.getElementById('aviation-hero-overlay') as HTMLDivElement;
const windowWrapper = document.querySelector('.airplane-window-wrapper') as HTMLDivElement;

/**
 * Fits image into canvas mimicking CSS "background-size: cover"
 */
function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const canvas = ctx.canvas;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const imgWidth = img.width;
  const imgHeight = img.height;

  const imgRatio = imgWidth / imgHeight;
  const canvasRatio = canvasWidth / canvasHeight;

  let drawWidth = canvasWidth;
  let drawHeight = canvasHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (canvasRatio > imgRatio) {
    // Canvas is wider than image aspect ratio
    drawHeight = canvasWidth / imgRatio;
    offsetY = (canvasHeight - drawHeight) / 2;
  } else {
    // Canvas is taller than image aspect ratio
    drawWidth = canvasHeight * imgRatio;
    offsetX = (canvasWidth - drawWidth) / 2;
  }

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
}

/**
 * Renders a specific frame by index
 */
const renderFrame = (index: number) => {
  if (images[index] && images[index].complete) {
    drawImageCover(ctx, images[index]);
  }
};

/**
 * Main scroll logic
 */
const updateScroll = () => {
  if (!track || !canvas) return;

  const rect = track.getBoundingClientRect();
  const totalScrollable = rect.height - window.innerHeight;
  
  // Calculate vertical scroll offset within the scroll-track
  const scrolled = -rect.top;
  
  // Normalize progress between 0 and 1
  let progress = scrolled / totalScrollable;
  progress = Math.max(0, Math.min(1, progress));

  // Determine current frame index
  const targetFrame = Math.min(totalFrames - 1, Math.floor(progress * totalFrames));
  
  if (targetFrame !== currentFrameIndex) {
    currentFrameIndex = targetFrame;
    renderFrame(currentFrameIndex);
  }

  // Fade out bottom scroll prompt icon after minimal scrolling
  const scrollIndicator = document.getElementById('scroll-indicator');
  if (scrollIndicator) {
    if (progress > 0.02) {
      scrollIndicator.classList.add('fade-out');
    } else {
      scrollIndicator.classList.remove('fade-out');
    }
  }

  // Fade in / out aviation overlay at the transition boundary (around frame 74)
  if (aviationOverlay) {
    let opacity = 0;
    const fadeInStart = 65;
    const fadeInEnd = 72;
    const fadeOutStart = 84;
    const fadeOutEnd = 91;

    if (currentFrameIndex >= fadeInStart && currentFrameIndex <= fadeOutEnd) {
      if (currentFrameIndex < fadeInEnd) {
        opacity = (currentFrameIndex - fadeInStart) / (fadeInEnd - fadeInStart);
      } else if (currentFrameIndex > fadeOutStart) {
        opacity = (fadeOutEnd - currentFrameIndex) / (fadeOutEnd - fadeOutStart);
      } else {
        opacity = 1;
      }
    } else {
      opacity = 0;
    }

    opacity = Math.max(0, Math.min(1, opacity));
    aviationOverlay.style.opacity = String(opacity);
    if (opacity > 0.01) {
      aviationOverlay.style.visibility = 'visible';
      aviationOverlay.style.pointerEvents = 'auto';
    } else {
      aviationOverlay.style.visibility = 'hidden';
      aviationOverlay.style.pointerEvents = 'none';
    }
  }

  // Animate the center title "Jesko Jets" to slide up and lock to the navbar after frame 91
  if (windowWrapper) {
    const startFrame = 91;
    const endFrame = 106;
    let p = 0;
    if (currentFrameIndex >= startFrame) {
      p = (currentFrameIndex - startFrame) / (endFrame - startFrame);
      p = Math.max(0, Math.min(1, p));
    }

    const centerY = window.innerHeight / 2;
    const targetY = 32 + 10; // 32px top navbar padding + vertical half-offset of text
    const translateY = -p * (centerY - targetY);
    const scale = 1 - p * 0.25; // scale down from 1.0 to 0.75

    windowWrapper.style.transform = `translate(-50%, -50%) translateY(${translateY}px) scale(${scale})`;
  }
};

/**
 * Adapts canvas dimensions and redraws
 */
const handleResize = () => {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  renderFrame(currentFrameIndex);
  updateScroll(); // Recalculate scrolling positions and wrapper transformations
};

/**
 * Initializes listeners and draws first frame after loading finishes
 */
const initExperience = () => {
  // Hide loader
  loader.classList.add('hidden');
  
  // Canvas initialization
  handleResize();
  
  // Listeners
  window.addEventListener('resize', handleResize, { passive: true });
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Draw initial frame
  renderFrame(0);
  
  // Initialize scroll positions and overlay states
  updateScroll();
};

// Trigger image preloading
const startPreload = () => {
  for (let i = 0; i < totalFrames; i++) {
    const img = new Image();
    img.src = getFramePath(i);
    img.onload = () => {
      loadedCount++;
      const progressPercent = Math.floor((loadedCount / totalFrames) * 100);
      
      // Update UI loader
      if (loaderPercentage) {
        loaderPercentage.textContent = `${progressPercent}%`;
      }
      if (loaderBar) {
        loaderBar.style.width = `${progressPercent}%`;
      }

      if (loadedCount === totalFrames) {
        // Complete preload and initialize app
        setTimeout(initExperience, 500); // Tiny pause for fluid visual completion
      }
    };
    img.onerror = () => {
      // Fallback for errors so page doesn't hang
      loadedCount++;
      if (loadedCount === totalFrames) {
        setTimeout(initExperience, 500);
      }
    };
    images.push(img);
  }
};

// Replay action
if (replayBtn) {
  replayBtn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// Start preloading frames immediately
startPreload();
