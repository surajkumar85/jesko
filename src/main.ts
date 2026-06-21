import './style.css';

// Total number of frame images in Hero and Luxury tracks
const totalHeroFrames = 114;
const firstSceneFrames = 74;
const totalLuxuryFrames = 63; // 63 frames in public/third_scene (0 to 62)

// Helper to resolve the relative path for each image in Hero track
const getHeroFramePath = (index: number): string => {
  if (index < firstSceneFrames) {
    const paddedIndex = String(index).padStart(5, '0');
    return `/first_scene/frame_${paddedIndex}.jpg`;
  } else {
    const secondIndex = index - firstSceneFrames;
    const paddedIndex = String(secondIndex).padStart(5, '0');
    return `/second_scene/frame_${paddedIndex}.jpg`;
  }
};

// Helper to resolve the relative path for each image in Luxury track
const getLuxuryFramePath = (index: number): string => {
  const paddedIndex = String(index).padStart(5, '0');
  return `/third_scene/frame_${paddedIndex}.jpg`;
};

// State variables
const heroImages: HTMLImageElement[] = [];
const luxuryImages: HTMLImageElement[] = [];
let loadedCount = 0;
let currentHeroFrameIndex = 0;
let currentLuxuryFrameIndex = 0;
let ticking = false;

// DOM Elements
const loader = document.getElementById('loader') as HTMLDivElement;
const loaderPercentage = document.getElementById('loader-percentage') as HTMLSpanElement;
const loaderBar = document.getElementById('loader-bar') as HTMLDivElement;

const heroTrack = document.getElementById('hero-scroll-track') as HTMLDivElement;
const heroCanvas = document.getElementById('hero-canvas') as HTMLCanvasElement;
const heroCtx = heroCanvas.getContext('2d') as CanvasRenderingContext2D;

const luxuryTrack = document.getElementById('luxury-scroll-track') as HTMLDivElement;
const luxuryCanvas = document.getElementById('luxury-canvas') as HTMLCanvasElement;
const luxuryCtx = luxuryCanvas.getContext('2d') as CanvasRenderingContext2D;

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
 * Renders a specific frame by index on the Hero Canvas
 */
const renderHeroFrame = (index: number) => {
  if (heroImages[index] && heroImages[index].complete) {
    drawImageCover(heroCtx, heroImages[index]);
  }
};

/**
 * Renders a specific frame by index on the Luxury Canvas
 */
const renderLuxuryFrame = (index: number) => {
  if (luxuryImages[index] && luxuryImages[index].complete) {
    drawImageCover(luxuryCtx, luxuryImages[index]);
  }
};

/**
 * Hero track scroll logic
 */
const updateHeroScroll = () => {
  if (!heroTrack || !heroCanvas) return;

  const rect = heroTrack.getBoundingClientRect();
  const totalScrollable = rect.height - window.innerHeight;
  const scrolled = -rect.top;
  
  let progress = scrolled / totalScrollable;
  progress = Math.max(0, Math.min(1, progress));

  const targetFrame = Math.min(totalHeroFrames - 1, Math.floor(progress * totalHeroFrames));
  
  if (targetFrame !== currentHeroFrameIndex) {
    currentHeroFrameIndex = targetFrame;
    renderHeroFrame(currentHeroFrameIndex);
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

    if (currentHeroFrameIndex >= fadeInStart && currentHeroFrameIndex <= fadeOutEnd) {
      if (currentHeroFrameIndex < fadeInEnd) {
        opacity = (currentHeroFrameIndex - fadeInStart) / (fadeInEnd - fadeInStart);
      } else if (currentHeroFrameIndex > fadeOutStart) {
        opacity = (fadeOutEnd - currentHeroFrameIndex) / (fadeOutEnd - fadeOutStart);
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
    if (currentHeroFrameIndex >= startFrame) {
      p = (currentHeroFrameIndex - startFrame) / (endFrame - startFrame);
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
 * Luxury track scroll logic
 */
const updateLuxuryScroll = () => {
  if (!luxuryTrack || !luxuryCanvas) return;

  const rect = luxuryTrack.getBoundingClientRect();
  
  // Optimize execution: only compute/render if the section is on screen
  if (rect.bottom < 0 || rect.top > window.innerHeight) return;

  const totalScrollable = rect.height - window.innerHeight;
  const scrolled = -rect.top;
  
  let progress = scrolled / totalScrollable;
  progress = Math.max(0, Math.min(1, progress));

  const targetFrame = Math.min(totalLuxuryFrames - 1, Math.floor(progress * totalLuxuryFrames));
  
  if (targetFrame !== currentLuxuryFrameIndex) {
    currentLuxuryFrameIndex = targetFrame;
    renderLuxuryFrame(currentLuxuryFrameIndex);
  }
};

/**
 * Adapts canvas dimensions and redraws
 */
const handleResize = () => {
  if (heroCanvas) {
    heroCanvas.width = window.innerWidth;
    heroCanvas.height = window.innerHeight;
    renderHeroFrame(currentHeroFrameIndex);
  }
  if (luxuryCanvas) {
    luxuryCanvas.width = window.innerWidth;
    luxuryCanvas.height = window.innerHeight;
    renderLuxuryFrame(currentLuxuryFrameIndex);
  }
  updateHeroScroll();
  updateLuxuryScroll();
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
        updateHeroScroll();
        updateLuxuryScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Draw initial frames
  renderHeroFrame(0);
  renderLuxuryFrame(0);
  
  // Initialize scroll positions and states
  updateHeroScroll();
  updateLuxuryScroll();
};

// Trigger image preloading
const startPreload = () => {
  const totalToLoad = totalHeroFrames + totalLuxuryFrames;
  
  const checkAllLoaded = () => {
    if (loadedCount === totalToLoad) {
      setTimeout(initExperience, 500); // Tiny pause for fluid visual completion
    }
  };

  const handleImageLoad = () => {
    loadedCount++;
    const progressPercent = Math.floor((loadedCount / totalToLoad) * 100);
    
    // Update UI loader
    if (loaderPercentage) {
      loaderPercentage.textContent = `${progressPercent}%`;
    }
    if (loaderBar) {
      loaderBar.style.width = `${progressPercent}%`;
    }
    checkAllLoaded();
  };

  const handleImageError = () => {
    loadedCount++;
    checkAllLoaded();
  };

  // Preload Hero frames
  for (let i = 0; i < totalHeroFrames; i++) {
    const img = new Image();
    img.src = getHeroFramePath(i);
    img.onload = handleImageLoad;
    img.onerror = handleImageError;
    heroImages.push(img);
  }

  // Preload Luxury frames
  for (let i = 0; i < totalLuxuryFrames; i++) {
    const img = new Image();
    img.src = getLuxuryFramePath(i);
    img.onload = handleImageLoad;
    img.onerror = handleImageError;
    luxuryImages.push(img);
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
