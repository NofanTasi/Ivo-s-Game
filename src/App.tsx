/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Settings, 
  User, 
  Cpu, 
  Info, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  HelpCircle,
  ZoomIn,
  ZoomOut,
  Maximize,
  Lightbulb,
  Sparkles,
  History
} from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types ---

type PlayerType = 'human' | 'ai';
type Player = 'player1' | 'player2';

interface BlockData {
  id: string;
  i: number;
  j: number;
  product: number;
  placed: boolean;
}

interface SquareData {
  id: number;
  value: number;
  highlighted: boolean;
  blockCount: number;
}

interface GameState {
  n: number;
  players: {
    player1: { type: PlayerType; score: number; name: string };
    player2: { type: PlayerType; score: number; name: string };
  };
  currentPlayer: Player;
  blocks: BlockData[];
  squares: SquareData[];
  selectedBlockId: string | null;
  gameOver: boolean;
  history: string[];
  lastMove: { i: number; j: number; product: number; blockId: string } | null;
}

// --- Constants ---

const MIN_N = 5;
const MAX_N = 13;

// --- Utilities ---

const generateBlocks = (n: number): BlockData[] => {
  const blocks: BlockData[] = [];
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= n; j++) {
      blocks.push({
        id: `${i}x${j}`,
        i,
        j,
        product: i * j,
        placed: false,
      });
    }
  }
  return blocks;
};

const generateSquares = (n: number): SquareData[] => {
  const squares: SquareData[] = [];
  for (let i = 1; i <= n * n; i++) {
    squares.push({
      id: i,
      value: i,
      highlighted: false,
      blockCount: 0,
    });
  }
  return squares;
};

// --- Main Component ---

export default function App() {
  const [n, setN] = useState(9);
  const [p2Type, setP2Type] = useState<PlayerType>('ai');
  const [startingPlayer, setStartingPlayer] = useState<Player>('player1');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showStrategy, setShowStrategy] = useState(false);

  // Initialize Game
  const initGame = useCallback(() => {
    const initialBlocks = generateBlocks(n);
    const initialSquares = generateSquares(n);
    setGameState({
      n,
      players: {
        player1: { type: 'human', score: 0, name: 'Player 1' },
        player2: { type: p2Type, score: 0, name: p2Type === 'ai' ? 'Computer' : 'Player 2' },
      },
      currentPlayer: startingPlayer,
      blocks: initialBlocks,
      squares: initialSquares,
      selectedBlockId: null,
      gameOver: false,
      history: [],
      lastMove: null,
    });
    setShowSettings(false);
  }, [n, p2Type, startingPlayer]);

  // Handle Block Selection
  const selectBlock = useCallback((id: string) => {
    if (!gameState || gameState.gameOver) return;
    const block = gameState.blocks.find(b => b.id === id);
    if (!block || block.placed) return;

    setGameState(prev => prev ? ({
      ...prev,
      selectedBlockId: id
    }) : null);
  }, [gameState]);

  // Handle Square Selection
  const selectSquare = useCallback((squareId: number, overrideBlockId?: string) => {
    if (!gameState || gameState.gameOver) return;
    
    const blockId = overrideBlockId || gameState.selectedBlockId;
    if (!blockId) return;

    const block = gameState.blocks.find(b => b.id === blockId);
    const square = gameState.squares.find(s => s.id === squareId);

    if (!block || !square) return;

    const isCorrect = block.product === square.value;

    if (isCorrect) {
      // Correct Placement
      const isBonus = square.highlighted;
      const points = isBonus ? 1 : 0;

      const allPlaced = gameState.blocks.filter(b => !b.placed).length === 1;

      setGameState(prev => {
        if (!prev) return null;
        const newBlocks = prev.blocks.map(b => b.id === block.id ? { ...b, placed: true } : b);
        const newSquares = prev.squares.map(s => s.id === square.id ? { 
          ...s, 
          highlighted: true, 
          blockCount: s.blockCount + 1 
        } : s);
        
        const nextPlayer = prev.currentPlayer === 'player1' ? 'player2' : 'player1';

        return {
          ...prev,
          blocks: newBlocks,
          squares: newSquares,
          selectedBlockId: null,
          currentPlayer: nextPlayer,
          players: {
            ...prev.players,
            [prev.currentPlayer]: {
              ...prev.players[prev.currentPlayer],
              score: prev.players[prev.currentPlayer].score + points
            }
          },
          gameOver: allPlaced,
          lastMove: { i: block.i, j: block.j, product: block.product, blockId: block.id },
          history: [...prev.history, `${prev.currentPlayer} placed ${block.id} on ${square.value} (${isBonus ? '+1 pt' : '0 pt'})`]
        };
      });

      if (allPlaced) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0000FF', '#FF0000', '#FFFF00', '#00FFFF', '#FF00FF', '#00FF00']
        });
      }
    }
  }, [gameState]);

  // AI Logic
  useEffect(() => {
    if (!gameState || gameState.gameOver || gameState.players[gameState.currentPlayer].type !== 'ai') return;

    const timer = setTimeout(() => {
      const availableBlocks = gameState.blocks.filter(b => !b.placed);
      if (availableBlocks.length === 0) return;

      let chosenBlock: BlockData;

      // Strategy Implementation
      const lastMove = gameState.lastMove;
      const candidates: BlockData[] = [];
      
      // (1) Mirror Strategy
      if (lastMove && lastMove.i !== lastMove.j) {
        const mirrorId = `${lastMove.j}x${lastMove.i}`;
        const mirrorBlock = availableBlocks.find(b => b.id === mirrorId);
        if (mirrorBlock) candidates.push(mirrorBlock);
        
        // Find any other block with same product
        const sameProductBlocks = availableBlocks.filter(b => b.product === lastMove.product && b.id !== mirrorId);
        candidates.push(...sameProductBlocks);
      } 
      
      // (2) Diagonal Strategy
      if (lastMove && lastMove.i === lastMove.j) {
        const diagonals = availableBlocks.filter(b => b.i === b.j);
        candidates.push(...diagonals);
        
        const diagonalSquares = Array.from({ length: gameState.n }, (_, i) => (i + 1) * (i + 1));
        const blocksForDiagonalSquares = availableBlocks.filter(b => diagonalSquares.includes(b.product) && b.i !== b.j);
        candidates.push(...blocksForDiagonalSquares);
      }

      // If we have strategic candidates, pick one randomly (less transparent)
      // Otherwise, pick a diagonal or a random block
      if (candidates.length > 0 && Math.random() > 0.1) {
        chosenBlock = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        const diagonals = availableBlocks.filter(b => b.i === b.j);
        if (diagonals.length > 0 && Math.random() > 0.3) {
          chosenBlock = diagonals[Math.floor(Math.random() * diagonals.length)];
        } else {
          chosenBlock = availableBlocks[Math.floor(Math.random() * availableBlocks.length)];
        }
      }

      // Execute AI Turn
      selectBlock(chosenBlock.id);
      selectSquare(chosenBlock.product, chosenBlock.id);
    }, 600);

    return () => clearTimeout(timer);
  }, [gameState, selectBlock, selectSquare]);

  // Render Settings
    if (showSettings) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-[var(--color-pure-black)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--color-wood-modal)] rounded-[3rem] shadow-2xl p-10 max-w-md w-full border-4 border-[var(--color-pure-white)]/20"
          style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png")' }}
        >
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-[var(--color-pure-yellow)] p-4 rounded-2xl shadow-xl border-t-2 border-[var(--color-pure-white)]/40">
              <Trophy className="text-[var(--color-pure-black)] w-8 h-8" />
            </div>
            <h1 className="text-3xl font-black text-[var(--color-pure-white)] tracking-tight leading-tight drop-shadow-lg">Multiplication Quest</h1>
          </div>

          <div className="space-y-8">
            <div>
              <label className="block text-xs font-black text-[var(--color-pure-yellow)] uppercase tracking-[0.2em] mb-4">Board Size (N)</label>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: MAX_N - MIN_N + 1 }, (_, i) => MIN_N + i).map(val => (
                  <button
                    key={val}
                    onClick={() => setN(val)}
                    className={`py-3 rounded-xl font-black transition-all border-2 text-sm ${
                      n === val 
                        ? 'bg-[var(--color-pure-yellow)] border-[var(--color-pure-white)] text-[var(--color-pure-black)] shadow-xl scale-105' 
                        : 'bg-[var(--color-pure-black)]/40 border-[var(--color-pure-white)]/10 text-[var(--color-pure-white)] hover:bg-[var(--color-pure-black)]/60'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[var(--color-pure-yellow)] uppercase tracking-[0.2em] mb-4">Opponent</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setP2Type('ai')}
                  className={`flex-1 py-4 px-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all border-2 ${
                    p2Type === 'ai' 
                      ? 'bg-[var(--color-pure-yellow)] border-[var(--color-pure-white)] text-[var(--color-pure-black)] shadow-xl scale-105' 
                      : 'bg-[var(--color-pure-black)]/40 border-[var(--color-pure-white)]/10 text-[var(--color-pure-white)] hover:bg-[var(--color-pure-black)]/60'
                  }`}
                >
                  <Cpu size={20} /> Computer
                </button>
                <button
                  onClick={() => setP2Type('human')}
                  className={`flex-1 py-4 px-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all border-2 ${
                    p2Type === 'human' 
                      ? 'bg-[var(--color-pure-yellow)] border-[var(--color-pure-white)] text-[var(--color-pure-black)] shadow-xl scale-105' 
                      : 'bg-[var(--color-pure-black)]/40 border-[var(--color-pure-white)]/10 text-[var(--color-pure-white)] hover:bg-[var(--color-pure-black)]/60'
                  }`}
                >
                  <User size={20} /> Human
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[var(--color-pure-yellow)] uppercase tracking-[0.2em] mb-4">Who Starts?</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setStartingPlayer('player1')}
                  className={`flex-1 py-4 px-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all border-2 ${
                    startingPlayer === 'player1' 
                      ? 'bg-[var(--color-pure-yellow)] border-[var(--color-pure-white)] text-[var(--color-pure-black)] shadow-xl scale-105' 
                      : 'bg-[var(--color-pure-black)]/40 border-[var(--color-pure-white)]/10 text-[var(--color-pure-white)] hover:bg-[var(--color-pure-black)]/60'
                  }`}
                >
                  <User size={20} /> Me
                </button>
                <button
                  onClick={() => setStartingPlayer('player2')}
                  className={`flex-1 py-4 px-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all border-2 ${
                    startingPlayer === 'player2' 
                      ? 'bg-[var(--color-pure-yellow)] border-[var(--color-pure-white)] text-[var(--color-pure-black)] shadow-xl scale-105' 
                      : 'bg-[var(--color-pure-black)]/40 border-[var(--color-pure-white)]/10 text-[var(--color-pure-white)] hover:bg-[var(--color-pure-black)]/60'
                  }`}
                >
                  {p2Type === 'ai' ? <Cpu size={20} /> : <User size={20} />} Opponent
                </button>
              </div>
            </div>

            <button
              onClick={initGame}
              className="w-full bg-[var(--color-pure-magenta)] hover:bg-[var(--color-pure-red)] text-[var(--color-pure-white)] py-5 rounded-2xl font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-3 mt-6 border-t-4 border-[var(--color-pure-white)]/30"
            >
              Start Adventure <ChevronRight size={24} />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!gameState) return null;

  const p1 = gameState.players.player1;
  const p2 = gameState.players.player2;
  const isP1Turn = gameState.currentPlayer === 'player1';
  const selectedBlock = gameState.blocks.find(b => b.id === gameState.selectedBlockId);

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans text-[var(--color-pure-white)] selection:bg-[var(--color-pure-cyan)]/40">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-[var(--color-highlight-p1)] p-4 rounded-2xl shadow-xl border-t border-[var(--color-pure-white)]/30">
              <Trophy className="text-[var(--color-pure-black)] w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[var(--color-pure-white)] tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">Multiplication Quest</h1>
              <p className="text-[var(--color-pure-yellow)] font-bold uppercase tracking-widest text-xs">Strategic Arithmetic Adventure</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setShowStrategy(!showStrategy)}
              className={`p-3 rounded-xl border-2 transition-all shadow-lg flex items-center gap-2 ${
                showStrategy ? 'bg-[var(--color-pure-white)] border-[var(--color-pure-white)] text-[var(--color-pure-black)]' : 'bg-[var(--color-pure-gray-dark)]/60 border-[var(--color-pure-white)]/20 text-[var(--color-pure-white)] hover:bg-[var(--color-pure-gray)]'
              }`}
              title="Strategy Guide"
            >
              <Lightbulb size={20} />
              <span className="hidden md:inline font-bold text-sm">Strategy</span>
            </button>
            <div className="flex items-center bg-[var(--color-pure-gray-dark)]/60 rounded-xl border-2 border-[var(--color-pure-white)]/20 shadow-lg overflow-hidden">
              <button 
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                className="p-3 hover:bg-[var(--color-pure-gray)] text-[var(--color-pure-white)] transition-all border-r border-[var(--color-pure-white)]/20"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <button 
                onClick={() => setZoom(1)}
                className="p-3 hover:bg-[var(--color-pure-gray)] text-[var(--color-pure-white)] transition-all border-r border-[var(--color-pure-white)]/20"
                title="Reset Zoom"
              >
                <Maximize size={18} />
              </button>
              <button 
                onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                className="p-3 hover:bg-[var(--color-pure-gray)] text-[var(--color-pure-white)] transition-all"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 bg-[var(--color-pure-gray-dark)]/60 hover:bg-[var(--color-pure-gray)] rounded-xl border-2 border-[var(--color-pure-white)]/20 text-[var(--color-pure-white)] transition-all shadow-lg"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={initGame}
              className="p-3 bg-[var(--color-pure-gray-dark)]/60 hover:bg-[var(--color-pure-gray)] rounded-xl border-2 border-[var(--color-pure-white)]/20 text-[var(--color-pure-white)] transition-all shadow-lg"
              title="Restart"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 gap-4 mb-8">
        <div className={`p-6 rounded-3xl transition-all border-4 ${isP1Turn ? 'bg-[var(--color-highlight-p1)] border-[var(--color-pure-white)] shadow-2xl scale-105' : 'bg-[var(--color-pure-black)]/40 border-transparent opacity-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isP1Turn ? 'bg-[var(--color-pure-white)] text-[var(--color-pure-black)]' : 'bg-[var(--color-pure-gray-dark)] text-[var(--color-pure-yellow)]'}`}>
                <User size={20} />
              </div>
              <span className={`font-black text-lg uppercase tracking-tight ${isP1Turn ? 'text-[var(--color-pure-black)]' : 'text-[var(--color-pure-white)]'}`}>{p1.name}</span>
            </div>
            <span className={`text-4xl font-black tabular-nums ${isP1Turn ? 'text-[var(--color-pure-black)]' : 'text-[var(--color-pure-white)]'}`}>{p1.score}</span>
          </div>
          <div className="h-2 bg-[var(--color-pure-black)]/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[var(--color-pure-white)]"
              animate={{ width: isP1Turn ? '100%' : '0%' }}
            />
          </div>
        </div>

        <div className={`p-6 rounded-3xl transition-all border-4 ${!isP1Turn ? 'bg-[var(--color-highlight-p2)] border-[var(--color-pure-white)] shadow-2xl scale-105' : 'bg-[var(--color-pure-black)]/40 border-transparent opacity-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${!isP1Turn ? 'bg-[var(--color-pure-white)] text-[var(--color-pure-black)]' : 'bg-[var(--color-pure-gray-dark)] text-[var(--color-pure-magenta)]'}`}>
                {p2.type === 'ai' ? <Cpu size={20} /> : <User size={20} />}
              </div>
              <span className={`font-black text-lg uppercase tracking-tight ${!isP1Turn ? 'text-[var(--color-pure-black)]' : 'text-[var(--color-pure-white)]'}`}>{p2.name}</span>
            </div>
            <span className={`text-4xl font-black tabular-nums ${!isP1Turn ? 'text-[var(--color-pure-black)]' : 'text-[var(--color-pure-white)]'}`}>{p2.score}</span>
          </div>
          <div className="h-2 bg-[var(--color-pure-black)]/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-[var(--color-pure-white)]"
              animate={{ width: !isP1Turn ? '100%' : '0%' }}
            />
          </div>
        </div>
      </div>

      {/* Strategy Guide */}
      <AnimatePresence>
        {showStrategy && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="max-w-7xl mx-auto mb-8 overflow-hidden"
          >
            <div className="bg-[var(--color-pure-yellow)]/10 border border-[var(--color-pure-yellow)]/20 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-[var(--color-pure-yellow)] font-bold flex items-center gap-2 mb-2">
                  <Sparkles size={18} /> The Mirror Strategy
                </h3>
                <p className="text-[var(--color-pure-white)]/80 text-sm leading-relaxed">
                  If your opponent places a block like <span className="font-bold">2x6</span>, try to find the mirror block <span className="font-bold">6x2</span>. 
                  This helps you control the squares and sets you up for bonus points!
                </p>
              </div>
              <div>
                <h3 className="text-[var(--color-pure-yellow)] font-bold flex items-center gap-2 mb-2">
                  <Trophy size={18} /> The Diagonal Secret
                </h3>
                <p className="text-[var(--color-pure-white)]/80 text-sm leading-relaxed">
                  Diagonal blocks (like <span className="font-bold">4x4</span> or <span className="font-bold">9x9</span>) are special. 
                  They are the only ones that land on squares with an odd number of possible combinations. 
                  Placing these early can be the key to winning!
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto overflow-auto custom-scrollbar">
        <div 
          className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-12 p-8 wood-panel rounded-[3rem]"
          style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: 'top center',
            width: zoom > 1 ? `${zoom * 100}%` : '100%'
          }}
        >
          {/* Left: The Box */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-[var(--color-pure-yellow)] uppercase tracking-tighter flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--color-pure-yellow)] rounded-lg flex items-center justify-center text-[var(--color-pure-black)]">
                  <RotateCcw size={18} />
                </div>
                The Box
              </h2>
              <span className="bg-[var(--color-pure-black)]/40 px-4 py-1.5 rounded-full text-xs font-bold text-[var(--color-pure-yellow)] uppercase tracking-widest border border-[var(--color-pure-white)]/5">
                {gameState.blocks.filter(b => !b.placed).length} Blocks Left
              </span>
            </div>
            
            <div 
              className="grid gap-3 bg-black/30 p-4 rounded-3xl border border-white/5 shadow-inner"
              style={{ gridTemplateColumns: `repeat(${gameState.n}, minmax(0, 1fr))` }}
            >
              {gameState.blocks.map(block => (
                <button
                  key={block.id}
                  disabled={block.placed || (gameState.players[gameState.currentPlayer].type === 'ai')}
                  onClick={() => selectBlock(block.id)}
                  className={`
                    aspect-square flex items-center justify-center text-[10px] md:text-xs font-black rounded-lg transition-all relative
                    ${block.placed ? 
                      (gameState.lastMove?.blockId === block.id ? 'bg-[var(--color-pure-red)] text-[var(--color-pure-white)] shadow-2xl ring-4 ring-[var(--color-pure-white)] z-10 animate-pulse' : 'wood-slot text-transparent') 
                      : 
                      gameState.selectedBlockId === block.id ? 'bg-[var(--color-highlight-select)] text-[var(--color-pure-black)] shadow-2xl scale-110 z-10 ring-4 ring-[var(--color-pure-white)]' : 
                      'wood-tile-black text-[var(--color-pure-yellow)] ring-1 ring-[var(--color-pure-white)]/5 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] hover:scale-105 active:scale-95'}
                  `}
                >
                  {!block.placed || gameState.lastMove?.blockId === block.id ? block.id : ''}
                  {gameState.lastMove?.blockId === block.id && (
                    <span className="absolute -top-2 -right-2 bg-[var(--color-pure-red)] text-[var(--color-pure-white)] text-[8px] px-1.5 py-0.5 rounded-full font-black shadow-sm z-20">
                      LAST
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Active Block Indicator */}
            <AnimatePresence>
              {selectedBlock && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-[var(--color-highlight-select)] text-[var(--color-pure-black)] p-6 rounded-3xl shadow-2xl flex items-center justify-between border-t-4 border-[var(--color-pure-white)]/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-[var(--color-pure-black)]/20 p-3 rounded-2xl">
                      <HelpCircle size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-[var(--color-pure-black)]/60 uppercase tracking-widest">Active Block</p>
                      <p className="text-3xl font-black">{selectedBlock.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-[var(--color-pure-black)]/60 uppercase tracking-widest">Target Product</p>
                    <p className="text-3xl font-black">{selectedBlock.product}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Field Board */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-[var(--color-pure-yellow)] uppercase tracking-tighter flex items-center gap-3">
              <div className="w-8 h-8 bg-[var(--color-pure-red)] rounded-lg flex items-center justify-center text-[var(--color-pure-white)]">
                <Trophy size={18} />
              </div>
              The Field
            </h2>
            
            <div 
              className="grid gap-2 bg-[var(--color-pure-black)]/40 p-4 rounded-3xl border-2 border-[var(--color-pure-white)]/10"
              style={{ 
                gridTemplateColumns: `repeat(${gameState.n}, minmax(0, 1fr))` 
              }}
            >
              {gameState.squares.map(square => (
                <button
                  key={square.id}
                  disabled={gameState.players[gameState.currentPlayer].type === 'ai'}
                  onClick={() => selectSquare(square.id)}
                  className={`
                    aspect-square flex items-center justify-center text-[10px] md:text-sm font-black rounded-lg transition-all
                    ${square.highlighted ? 
                      'bg-[var(--color-highlight-success)] text-[var(--color-pure-black)] shadow-2xl scale-105 border-t-2 border-[var(--color-pure-white)]/40' : 
                      'wood-slot text-[var(--color-pure-white)] font-bold hover:text-[var(--color-pure-cyan)] hover:bg-[var(--color-pure-black)]/60'}
                  `}
                >
                  {square.value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="max-w-7xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[var(--color-pure-black)]/40 p-8 rounded-[2.5rem] shadow-2xl border-2 border-[var(--color-pure-white)]/10 md:col-span-2">
          <h3 className="text-sm font-black text-[var(--color-pure-yellow)] uppercase tracking-widest mb-6 flex items-center gap-2">
            <History size={16} /> Game Log
          </h3>
          <div className="h-40 overflow-y-auto space-y-3 pr-4 custom-scrollbar">
            {gameState.history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-[var(--color-pure-white)]/20">
                <Info size={32} className="mb-2 opacity-20" />
                <p className="italic text-sm">Waiting for the first move...</p>
              </div>
            ) : (
              gameState.history.slice().reverse().map((log, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={i} 
                  className="flex items-center gap-4 text-sm text-[var(--color-pure-white)] border-b border-[var(--color-pure-white)]/10 pb-3"
                >
                  <div className={`w-3 h-3 rounded-full shrink-0 ${log.includes('player1') ? 'bg-[var(--color-pure-yellow)] shadow-[0_0_12px_rgba(255,255,0,0.8)]' : 'bg-[var(--color-pure-magenta)] shadow-[0_0_12px_rgba(255,0,255,0.8)]'}`}></div>
                  <span className="font-mono text-[10px] text-[var(--color-pure-white)]/40">#{gameState.history.length - i}</span>
                  <span className="flex-1 font-bold">{log}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="bg-[var(--color-pure-black)]/40 p-8 rounded-[2.5rem] shadow-2xl border-2 border-[var(--color-pure-white)]/10">
          <h3 className="text-sm font-black text-[var(--color-pure-yellow)] uppercase tracking-widest mb-4 flex items-center gap-2">
            <Settings size={16} /> Game Info
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--color-pure-white)]/60 font-bold">Board Size</span>
              <span className="font-black text-[var(--color-pure-white)]">{gameState.n}x{gameState.n}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-[var(--color-pure-white)]/60 font-bold">Opponent</span>
              <span className="font-black text-[var(--color-pure-white)]">{gameState.players.player2.type === 'ai' ? 'Computer' : 'Human'}</span>
            </div>
            <div className="pt-4 border-t border-[var(--color-pure-white)]/10">
              <button 
                onClick={() => setShowSettings(true)}
                className="w-full py-3 bg-[var(--color-pure-gray)] hover:bg-[var(--color-pure-gray-light)] text-[var(--color-pure-white)] rounded-xl font-black transition-all shadow-xl flex items-center justify-center gap-2 border-t border-[var(--color-pure-white)]/20"
              >
                <Settings size={18} /> New Game
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState.gameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[var(--color-pure-black)]/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[var(--color-wood-modal)] rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl border-4 border-[var(--color-pure-white)]/20"
              style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png")' }}
            >
              <div className="w-24 h-24 bg-[var(--color-pure-yellow)] text-[var(--color-pure-black)] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl ring-4 ring-[var(--color-pure-white)]/20">
                <Trophy size={48} />
              </div>
              <h2 className="text-4xl font-black text-[var(--color-pure-white)] mb-2 drop-shadow-lg">Game Over!</h2>
              <p className="text-[var(--color-pure-yellow)] mb-10 font-black uppercase tracking-widest text-sm">
                {p1.score > p2.score ? `${p1.name} wins!` : p2.score > p1.score ? `${p2.name} wins!` : "It's a draw!"}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="bg-[var(--color-pure-black)]/40 p-6 rounded-3xl border-2 border-[var(--color-pure-white)]/10">
                  <p className="text-[10px] font-black text-[var(--color-pure-white)]/60 uppercase tracking-[0.2em] mb-1">{p1.name}</p>
                  <p className="text-3xl font-black text-[var(--color-pure-yellow)]">{p1.score}</p>
                </div>
                <div className="bg-[var(--color-pure-black)]/40 p-6 rounded-3xl border-2 border-[var(--color-pure-white)]/10">
                  <p className="text-[10px] font-black text-[var(--color-pure-white)]/60 uppercase tracking-[0.2em] mb-1">{p2.name}</p>
                  <p className="text-3xl font-black text-[var(--color-pure-magenta)]">{p2.score}</p>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full bg-[var(--color-pure-yellow)] hover:bg-[var(--color-pure-white)] text-[var(--color-pure-black)] py-5 rounded-2xl font-black text-xl shadow-2xl transition-all border-t-4 border-[var(--color-pure-white)]/40"
              >
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
