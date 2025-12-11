"use client";

import React, { useEffect, useRef } from 'react';

export function AnimatedGridBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config = {
      gridSpacing: 50,
      mouseRadius: 250,
      stiffness: 0.03,
      damping: 0.9,
      drift: 0.5
    };

    let width: number, height: number;
    let particles: any[] = [];
    const mouse = { x: null as number | null, y: null as number | null };

    class Node {
      originX: number;
      originY: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
      phase: number;

      constructor(originX: number, originY: number) {
        this.originX = originX;
        this.originY = originY;
        this.x = originX;
        this.y = originY;
        this.vx = 0;
        this.vy = 0;
        this.phase = Math.random() * Math.PI * 2;
      }

      update() {
        let dx = this.originX - this.x;
        let dy = this.originY - this.y;
        
        let ax = dx * config.stiffness;
        let ay = dy * config.stiffness;
        
        if (mouse.x != null && mouse.y != null) {
          let mDx = mouse.x - this.x;
          let mDy = mouse.y - this.y;
          let dist = Math.sqrt(mDx * mDx + mDy * mDy);
          
          if (dist < config.mouseRadius) {
            let force = (config.mouseRadius - dist) / config.mouseRadius;
            let pushX = -(mDx / dist) * force * 5;
            let pushY = -(mDy / dist) * force * 5;
            
            ax += pushX;
            ay += pushY;
          }
        }

        this.phase += 0.02;
        ax += Math.cos(this.phase) * config.drift * 0.05;
        ay += Math.sin(this.phase) * config.drift * 0.05;

        this.vx += ax;
        this.vy += ay;
        
        this.vx *= config.damping;
        this.vy *= config.damping;
        
        this.x += this.vx;
        this.y += this.vy;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = '#22d3ee';
        
        let displacement = Math.sqrt(Math.pow(this.x - this.originX, 2) + Math.pow(this.y - this.originY, 2));
        let alpha = 0.3 + (displacement / 20);
        if (alpha > 1) alpha = 1;
        
        ctx.globalAlpha = alpha;
        ctx.fillRect(this.x - 1, this.y - 1, 2, 2);
        ctx.globalAlpha = 1;
      }
    }

    function init() {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      particles = [];

      const cols = Math.ceil(width / config.gridSpacing);
      const rows = Math.ceil(height / config.gridSpacing);

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * config.gridSpacing;
          const y = j * config.gridSpacing;
          particles.push(new Node(x, y));
        }
      }
    }

    function drawConnections() {
      if (!ctx) return;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.15)';
      ctx.lineWidth = 0.5;

      for (let i = 0; i < particles.length; i++) {
        let p1 = particles[i];
        
        for (let j = i + 1; j < particles.length; j++) {
          let p2 = particles[j];
          
          if (Math.abs(p1.originX - p2.originX) > config.gridSpacing) continue;
          if (Math.abs(p1.originY - p2.originY) > config.gridSpacing) continue;

          let dx = p1.x - p2.x;
          let dy = p1.y - p2.y;
          let dist = dx * dx + dy * dy;

          if (dist < 4500) { 
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }
      ctx.stroke();
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      particles.forEach(p => p.update());

      drawConnections();
      
      particles.forEach(p => p.draw());

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    init();
    animate();

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
        style={{ background: '#020617' }}
      />
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[1] bg-[radial-gradient(circle_at_center,_transparent_20%,_rgba(2,6,23,0.8)_90%)]"></div>
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-[2] opacity-15 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0),_rgba(255,255,255,0)_50%,_rgba(0,0,0,0.2)_50%,_rgba(0,0,0,0.2))] bg-[length:100%_4px]"></div>
    </>
  );
}

