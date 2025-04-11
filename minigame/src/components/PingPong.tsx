import React, { useEffect, useRef, useState } from 'react';

interface GameState {
    ballX: number;
    ballY: number;
    ballSpeedX: number;
    ballSpeedY: number;
    paddle1Y: number;
    paddle2Y: number;
    score1: number;
    score2: number;
    winner: number | null;
}

const PingPong: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopRef = useRef<number>(0);
    const BALL_SPEED = 1.8;
    const BALL_SPEED_INCREASE = 1.08;
    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [gameState, setGameState] = useState<GameState>({
        ballX: 400,
        ballY: 300,
        ballSpeedX: BALL_SPEED,
        ballSpeedY: BALL_SPEED,
        paddle1Y: 250,
        paddle2Y: 250,
        score1: 0,
        score2: 0,
        winner: null,
    });

    const PADDLE_HEIGHT = 100;
    const PADDLE_WIDTH = 10;
    const BALL_SIZE = 10;
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 600;
    const PADDLE_SPEED = 5;
    const WINNING_SCORE = 6;
    const COUNTDOWN_SECONDS = 3;

    // Track which keys are currently pressed
    const keysPressed = useRef<{ [key: string]: boolean }>({});

    // Track animation time for floating effect
    const animationTime = useRef<number>(0);

    // Function to get random ball direction
    const getRandomBallDirection = () => {
        // Randomly choose between -1.5 and 1.5 for X direction
        const randomX = Math.random() < 0.5 ? -1.5 : 1.5;
        // Randomly choose between -1.5 and 1.5 for Y direction
        const randomY = Math.random() < 0.5 ? -1.5 : 1.5;
        return { x: randomX, y: randomY };
    };

    // Function to start countdown
    const startCountdown = () => {
        // Move ball off-screen during countdown
        setGameState(prev => ({
            ...prev,
            ballX: -100,
            ballY: -100,
        }));

        // Start countdown
        setCountdown(COUNTDOWN_SECONDS);
    };

    // Handle countdown
    useEffect(() => {
        if (countdown === null) return;

        if (countdown <= 0) {
            // End countdown
            setCountdown(null);

            // Get random ball direction
            const randomDirection = getRandomBallDirection();

            // Reset ball position and speed
            setGameState(prev => ({
                ...prev,
                ballX: CANVAS_WIDTH / 2,
                ballY: CANVAS_HEIGHT / 2,
                ballSpeedX: randomDirection.x,
                ballSpeedY: randomDirection.y,
            }));
        } else {
            // Continue countdown
            const timer = setTimeout(() => {
                setCountdown(prev => prev !== null ? prev - 1 : null);
            }, 1000);

            return () => clearTimeout(timer);
        }
    }, [countdown]);

    // Function to check for winner
    const checkWinner = (score1: number, score2: number) => {
        if (score1 >= WINNING_SCORE) return 1;
        if (score2 >= WINNING_SCORE) return 2;
        return null;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Prevent default behavior for arrow keys and space
            if (['ArrowUp', 'ArrowDown', ' ', 'w', 's'].includes(e.key)) {
                e.preventDefault();
            }

            // Start game on Enter key
            if (e.key === 'Enter' && !gameStarted) {
                setGameStarted(true);
                return;
            }

            // Restart game on Enter key when there's a winner
            if (e.key === 'Enter' && gameState.winner !== null) {
                // Get random ball direction for new game
                const randomDirection = getRandomBallDirection();

                setGameState({
                    ballX: 400,
                    ballY: 300,
                    ballSpeedX: randomDirection.x,
                    ballSpeedY: randomDirection.y,
                    paddle1Y: 250,
                    paddle2Y: 250,
                    score1: 0,
                    score2: 0,
                    winner: null,
                });
                return;
            }

            // Only process paddle controls if game has started and no winner
            if (!gameStarted || gameState.winner !== null) return;

            // Mark key as pressed
            keysPressed.current[e.key.toLowerCase()] = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            // Mark key as released
            keysPressed.current[e.key.toLowerCase()] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameStarted, gameState.winner]);

    useEffect(() => {
        // Only start the game loop if the game has started
        if (!gameStarted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const gameLoop = () => {
            // Update animation time for floating effect
            animationTime.current += 0.05;

            setGameState((prev) => {
                const newState = { ...prev };

                // Skip ball movement during countdown or if there's a winner
                if (countdown === null && newState.winner === null) {
                    // Continuous paddle movement based on keys pressed
                    if (keysPressed.current['w'] && newState.paddle1Y > 0) {
                        newState.paddle1Y -= PADDLE_SPEED;
                    }
                    if (keysPressed.current['s'] && newState.paddle1Y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
                        newState.paddle1Y += PADDLE_SPEED;
                    }
                    if (keysPressed.current['arrowup'] && newState.paddle2Y > 0) {
                        newState.paddle2Y -= PADDLE_SPEED;
                    }
                    if (keysPressed.current['arrowdown'] && newState.paddle2Y < CANVAS_HEIGHT - PADDLE_HEIGHT) {
                        newState.paddle2Y += PADDLE_SPEED;
                    }

                    // Move ball
                    newState.ballX += newState.ballSpeedX;
                    newState.ballY += newState.ballSpeedY;

                    // Ball collision with top and bottom
                    if (newState.ballY <= 0) {
                        newState.ballY = 0;
                        newState.ballSpeedY = Math.abs(newState.ballSpeedY);
                    } else if (newState.ballY + BALL_SIZE >= CANVAS_HEIGHT) {
                        newState.ballY = CANVAS_HEIGHT - BALL_SIZE;
                        newState.ballSpeedY = -Math.abs(newState.ballSpeedY);
                    }

                    // Ball collision with paddles
                    if (
                        newState.ballX <= PADDLE_WIDTH &&
                        newState.ballY + BALL_SIZE >= newState.paddle1Y &&
                        newState.ballY <= newState.paddle1Y + PADDLE_HEIGHT &&
                        newState.ballSpeedX < 0 // Only bounce if ball is moving left
                    ) {
                        // Calculate where on the paddle the ball hit (0 to 1)
                        const hitPosition = (newState.ballY - newState.paddle1Y) / PADDLE_HEIGHT;

                        // Adjust ball direction based on where it hit the paddle
                        // Hit near the top = more upward, hit near the bottom = more downward
                        newState.ballSpeedY = (hitPosition - 0.5) * 2;

                        // Reverse horizontal direction and add a small speed boost
                        newState.ballSpeedX = Math.abs(newState.ballSpeedX) * BALL_SPEED_INCREASE;

                        // Ensure ball is outside the paddle to prevent multiple collisions
                        newState.ballX = PADDLE_WIDTH + 1;
                    }

                    if (
                        newState.ballX + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH &&
                        newState.ballY + BALL_SIZE >= newState.paddle2Y &&
                        newState.ballY <= newState.paddle2Y + PADDLE_HEIGHT &&
                        newState.ballSpeedX > 0 // Only bounce if ball is moving right
                    ) {
                        // Calculate where on the paddle the ball hit (0 to 1)
                        const hitPosition = (newState.ballY - newState.paddle2Y) / PADDLE_HEIGHT;

                        // Adjust ball direction based on where it hit the paddle
                        // Hit near the top = more upward, hit near the bottom = more downward
                        newState.ballSpeedY = (hitPosition - 0.5) * 2;

                        // Reverse horizontal direction and add a small speed boost
                        newState.ballSpeedX = -Math.abs(newState.ballSpeedX) * BALL_SPEED_INCREASE;

                        // Ensure ball is outside the paddle to prevent multiple collisions
                        newState.ballX = CANVAS_WIDTH - PADDLE_WIDTH - BALL_SIZE - 1;
                    }

                    // Score points
                    if (newState.ballX <= 0) {
                        newState.score2++;
                        // Check for winner
                        const winner = checkWinner(newState.score1, newState.score2);
                        if (winner) {
                            newState.winner = winner;
                        } else {
                            // Start countdown if no winner yet
                            startCountdown();
                        }
                    }

                    if (newState.ballX >= CANVAS_WIDTH) {
                        newState.score1++;
                        // Check for winner
                        const winner = checkWinner(newState.score1, newState.score2);
                        if (winner) {
                            newState.winner = winner;
                        } else {
                            // Start countdown if no winner yet
                            startCountdown();
                        }
                    }
                }

                return newState;
            });

            // Clear canvas
            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw background gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
            gradient.addColorStop(0, '#0a192f');
            gradient.addColorStop(0.5, '#112240');
            gradient.addColorStop(1, '#1a365d');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            // Draw center line
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(CANVAS_WIDTH / 2, 0);
            ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);

            // Calculate floating effect offset
            const floatOffset1 = Math.sin(animationTime.current) * 3;
            const floatOffset2 = Math.sin(animationTime.current + Math.PI / 2) * 3;

            // Draw paddles with gradient and floating effect
            const paddleGradient1 = ctx.createLinearGradient(0, gameState.paddle1Y, 0, gameState.paddle1Y + PADDLE_HEIGHT);
            paddleGradient1.addColorStop(0, '#4ecca3');
            paddleGradient1.addColorStop(1, '#45b392');
            ctx.fillStyle = paddleGradient1;

            // Draw paddle shadow 1
            ctx.shadowColor = 'rgba(78, 204, 163, 0.5)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;

            // Draw rounded paddle 1 with floating effect
            const radius = 5; // Corner radius
            ctx.beginPath();
            ctx.moveTo(0, gameState.paddle1Y + radius + floatOffset1);
            ctx.lineTo(0, gameState.paddle1Y + PADDLE_HEIGHT - radius + floatOffset1);
            ctx.quadraticCurveTo(0, gameState.paddle1Y + PADDLE_HEIGHT + floatOffset1, radius, gameState.paddle1Y + PADDLE_HEIGHT + floatOffset1);
            ctx.lineTo(PADDLE_WIDTH - radius, gameState.paddle1Y + PADDLE_HEIGHT + floatOffset1);
            ctx.quadraticCurveTo(PADDLE_WIDTH, gameState.paddle1Y + PADDLE_HEIGHT + floatOffset1, PADDLE_WIDTH, gameState.paddle1Y + PADDLE_HEIGHT - radius + floatOffset1);
            ctx.lineTo(PADDLE_WIDTH, gameState.paddle1Y + radius + floatOffset1);
            ctx.quadraticCurveTo(PADDLE_WIDTH, gameState.paddle1Y + floatOffset1, PADDLE_WIDTH - radius, gameState.paddle1Y + floatOffset1);
            ctx.lineTo(radius, gameState.paddle1Y + floatOffset1);
            ctx.quadraticCurveTo(0, gameState.paddle1Y + floatOffset1, 0, gameState.paddle1Y + radius + floatOffset1);
            ctx.fill();

            // Reset shadow for paddle 1
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            const paddleGradient2 = ctx.createLinearGradient(CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2Y, CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2Y + PADDLE_HEIGHT);
            paddleGradient2.addColorStop(0, '#e94560');
            paddleGradient2.addColorStop(1, '#d13a53');
            ctx.fillStyle = paddleGradient2;

            // Draw paddle shadow 2
            ctx.shadowColor = 'rgba(233, 69, 96, 0.5)';
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 10;

            // Draw rounded paddle 2 with floating effect
            ctx.beginPath();
            ctx.moveTo(CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2Y + radius + floatOffset2);
            ctx.lineTo(CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2Y + PADDLE_HEIGHT - radius + floatOffset2);
            ctx.quadraticCurveTo(CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2Y + PADDLE_HEIGHT + floatOffset2, CANVAS_WIDTH - PADDLE_WIDTH + radius, gameState.paddle2Y + PADDLE_HEIGHT + floatOffset2);
            ctx.lineTo(CANVAS_WIDTH - radius, gameState.paddle2Y + PADDLE_HEIGHT + floatOffset2);
            ctx.quadraticCurveTo(CANVAS_WIDTH, gameState.paddle2Y + PADDLE_HEIGHT + floatOffset2, CANVAS_WIDTH, gameState.paddle2Y + PADDLE_HEIGHT - radius + floatOffset2);
            ctx.lineTo(CANVAS_WIDTH, gameState.paddle2Y + radius + floatOffset2);
            ctx.quadraticCurveTo(CANVAS_WIDTH, gameState.paddle2Y + floatOffset2, CANVAS_WIDTH - radius, gameState.paddle2Y + floatOffset2);
            ctx.lineTo(CANVAS_WIDTH - PADDLE_WIDTH + radius, gameState.paddle2Y + floatOffset2);
            ctx.quadraticCurveTo(CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2Y + floatOffset2, CANVAS_WIDTH - PADDLE_WIDTH, gameState.paddle2Y + radius + floatOffset2);
            ctx.fill();

            // Reset shadow for paddle 2
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // Draw ball with glow effect
            ctx.shadowColor = 'white';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(gameState.ballX + BALL_SIZE / 2, gameState.ballY + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw scores with better styling
            ctx.font = 'bold 36px "Orbitron", sans-serif';
            ctx.fillStyle = '#4ecca3';
            ctx.fillText(gameState.score1.toString(), CANVAS_WIDTH / 4, 50);
            ctx.fillStyle = '#e94560';
            ctx.fillText(gameState.score2.toString(), (3 * CANVAS_WIDTH) / 4, 50);

            // Draw countdown with better styling
            if (countdown !== null) {
                // Draw semi-transparent overlay
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                // Draw "Starting new game in..." text
                ctx.font = '24px "Orbitron", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText(
                    'Starting new game in...',
                    CANVAS_WIDTH / 2,
                    CANVAS_HEIGHT / 2 - 60
                );

                // Draw countdown number with glow effect
                ctx.shadowColor = '#4ecca3';
                ctx.shadowBlur = 15;
                ctx.font = 'bold 72px "Orbitron", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(countdown.toString(), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
                ctx.shadowBlur = 0;
                ctx.textAlign = 'left';
            }

            // Draw winner message with better styling
            if (gameState.winner !== null) {
                // Draw semi-transparent overlay
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

                // Draw winner text with glow effect
                ctx.shadowColor = gameState.winner === 1 ? '#4ecca3' : '#e94560';
                ctx.shadowBlur = 15;
                ctx.font = 'bold 48px "Orbitron", sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.textAlign = 'center';
                ctx.fillText(
                    `Player ${gameState.winner} Wins!`,
                    CANVAS_WIDTH / 2,
                    CANVAS_HEIGHT / 2
                );

                // Draw restart instruction
                ctx.shadowBlur = 0;
                ctx.font = '24px "Orbitron", sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(
                    'Press Enter to Play Again',
                    CANVAS_WIDTH / 2,
                    CANVAS_HEIGHT / 2 + 60
                );
                ctx.textAlign = 'left';
            }

            gameLoopRef.current = requestAnimationFrame(gameLoop);
        };

        // Start the game loop
        gameLoopRef.current = requestAnimationFrame(gameLoop);

        return () => {
            if (gameLoopRef.current) {
                cancelAnimationFrame(gameLoopRef.current);
            }
        };
    }, [gameStarted, gameState, countdown]);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            fontFamily: '"Orbitron", sans-serif',
            background: 'linear-gradient(to bottom, #0a192f, #112240, #1a365d)',
            minHeight: '100vh',
            padding: '20px',
            color: 'white'
        }}>
            <h1 style={{
                fontSize: '36px',
                marginBottom: '20px',
                textShadow: '0 0 10px rgba(78, 204, 163, 0.7)',
                letterSpacing: '2px'
            }}>PING PONG</h1>

            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: '100%',
                maxWidth: '1200px',
                gap: '30px'
            }}>
                {/* Player 1 Instructions - Left Side */}
                <div style={{
                    textAlign: 'center',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    width: '200px'
                }}>
                    <h3 style={{ color: '#4ecca3', marginBottom: '15px' }}>Player 1 (WASD)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '30px', height: '30px', background: '#4ecca3', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>W</div>
                        <span>Up</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', background: '#4ecca3', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>S</div>
                        <span>Down</span>
                    </div>
                </div>

                {/* Game Canvas */}
                <div style={{ position: 'relative' }}>
                    <canvas
                        ref={canvasRef}
                        width={CANVAS_WIDTH}
                        height={CANVAS_HEIGHT}
                        style={{
                            border: '3px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '10px',
                            boxShadow: '0 0 30px rgba(0, 0, 0, 0.7)',
                        }}
                    />
                    {!gameStarted && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                alignItems: 'center',
                                background: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                fontSize: '24px',
                                fontWeight: 'bold',
                                borderRadius: '10px',
                            }}
                        >
                            <h2 style={{
                                fontSize: '32px',
                                marginBottom: '30px',
                                textShadow: '0 0 10px rgba(78, 204, 163, 0.7)',
                                letterSpacing: '2px'
                            }}>Press Enter to Start</h2>
                            <p style={{ marginTop: '20px', fontSize: '16px', color: '#e94560' }}>
                                First to {WINNING_SCORE} points wins!
                            </p>
                        </div>
                    )}
                </div>

                {/* Player 2 Instructions - Right Side */}
                <div style={{
                    textAlign: 'center',
                    background: 'rgba(0, 0, 0, 0.3)',
                    padding: '20px',
                    borderRadius: '10px',
                    boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    width: '200px'
                }}>
                    <h3 style={{ color: '#e94560', marginBottom: '15px' }}>Player 2 (Arrow Keys)</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ width: '30px', height: '30px', background: '#e94560', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>↑</div>
                        <span>Up</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '30px', height: '30px', background: '#e94560', borderRadius: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>↓</div>
                        <span>Down</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PingPong; 