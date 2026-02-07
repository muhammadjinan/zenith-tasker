import React, { useEffect, useRef } from 'react';

const ParticleBackground = () => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let particles = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const createParticles = () => {
            particles = [];
            const particleCount = Math.floor((canvas.width * canvas.height) / 15000);

            for (let i = 0; i < particleCount; i++) {
                particles.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    size: Math.random() * 2 + 0.5,
                    speedX: (Math.random() - 0.5) * 0.3,
                    speedY: (Math.random() - 0.5) * 0.3,
                    opacity: Math.random() * 0.5 + 0.2,
                    pulse: Math.random() * Math.PI * 2,
                    pulseSpeed: Math.random() * 0.02 + 0.01
                });
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                // Update position
                particle.x += particle.speedX;
                particle.y += particle.speedY;
                particle.pulse += particle.pulseSpeed;

                // Wrap around edges
                if (particle.x < 0) particle.x = canvas.width;
                if (particle.x > canvas.width) particle.x = 0;
                if (particle.y < 0) particle.y = canvas.height;
                if (particle.y > canvas.height) particle.y = 0;

                // Pulsing opacity
                const currentOpacity = particle.opacity * (0.5 + Math.sin(particle.pulse) * 0.5);

                // Draw particle
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(148, 163, 184, ${currentOpacity})`;
                ctx.fill();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        resizeCanvas();
        createParticles();
        animate();

        window.addEventListener('resize', () => {
            resizeCanvas();
            createParticles();
        });

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
            style={{
                background: 'linear-gradient(135deg, #0c1222 0%, #0f172a 50%, #0c1222 100%)',
                pointerEvents: 'none'  // Inline fallback in case Tailwind CSS isn't loading
            }}
        />
    );
};

export default ParticleBackground;
