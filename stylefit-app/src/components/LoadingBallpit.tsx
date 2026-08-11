import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const ballColors = ['#D7C39D', '#A99AD6', '#79689F', '#B67F93', '#E9DED0'];
const ballCount = 72;

type Ball = {
  scale: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
  z: number;
};

export default function LoadingBallpit() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
    const geometry = new THREE.SphereGeometry(0.34, 20, 20);
    const material = new THREE.MeshPhysicalMaterial({ clearcoat: 0.45, metalness: 0.08, roughness: 0.28, vertexColors: true });
    const balls = new THREE.InstancedMesh(geometry, material, ballCount);
    const transform = new THREE.Object3D();
    const pointer = new THREE.Vector2();
    const ballState: Ball[] = [];
    let animationFrame = 0;
    let isIntersecting = true;
    let isVisible = true;
    let halfHeight = 5;
    let halfWidth = 8;

    camera.position.z = 10;
    scene.add(new THREE.AmbientLight(0xfff4e8, 1.2));
    const keyLight = new THREE.PointLight(0xd0bdff, 52, 18);
    keyLight.position.set(2.5, 4, 5);
    scene.add(keyLight);
    const fillLight = new THREE.PointLight(0xefb9d4, 38, 16);
    fillLight.position.set(-4, -2, 3);
    scene.add(fillLight);

    for (let index = 0; index < ballCount; index += 1) {
      const scale = index === 0 ? 1.35 : 0.52 + Math.random() * 0.95;
      ballState.push({
        scale,
        velocityX: (Math.random() - 0.5) * 0.016,
        velocityY: (Math.random() - 0.5) * 0.016,
        x: (Math.random() - 0.5) * 14,
        y: (Math.random() - 0.5) * 9,
        z: (Math.random() - 0.5) * 1.8,
      });
      balls.setColorAt(index, new THREE.Color(ballColors[index % ballColors.length]));
    }
    balls.instanceColor?.setUsage(THREE.DynamicDrawUsage);
    scene.add(balls);

    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.35));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
      halfWidth = halfHeight * camera.aspect;
    };

    const movePointer = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth - 0.5) * halfWidth * 1.3;
      pointer.y = (0.5 - event.clientY / window.innerHeight) * halfHeight * 1.3;
    };

    const render = () => {
      if (!isVisible) {
        animationFrame = 0;
        return;
      }
      const leadBall = ballState[0];
      leadBall.x += (pointer.x - leadBall.x) * 0.035;
      leadBall.y += (pointer.y - leadBall.y) * 0.035;

      ballState.forEach((ball, index) => {
        if (index > 0) {
          ball.x += ball.velocityX;
          ball.y += ball.velocityY;
          const boundX = halfWidth + ball.scale;
          const boundY = halfHeight + ball.scale;
          if (Math.abs(ball.x) > boundX) ball.velocityX *= -1;
          if (Math.abs(ball.y) > boundY) ball.velocityY *= -1;
        }
        transform.position.set(ball.x, ball.y, ball.z);
        transform.scale.setScalar(ball.scale);
        transform.updateMatrix();
        balls.setMatrixAt(index, transform.matrix);
      });
      balls.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    const updateVisibility = () => {
      isVisible = isIntersecting && !document.hidden;
      if (isVisible && !animationFrame) animationFrame = window.requestAnimationFrame(render);
    };
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      updateVisibility();
    }, { threshold: 0 });
    const visibilityChange = () => updateVisibility();

    resize();
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', movePointer, { passive: true });
    document.addEventListener('visibilitychange', visibilityChange);
    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', movePointer);
      document.removeEventListener('visibilitychange', visibilityChange);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    };
  }, []);

  return <canvas ref={canvasRef} className="loading-ballpit" aria-hidden="true" />;
}
