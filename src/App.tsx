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
  History,
  Globe
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { translations, Language } from './translations';

// --- Types ---

type PlayerType = 'human' | 'ai';
type Player = 'player1' | 'player2';
type GameMode = 'alone' | 'human-human' | 'computer-human' | 'human-computer';

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
  mode: GameMode;
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

const MIN_N = 7;
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
  const [mode, setMode] = useState<GameMode>('human-computer');
  const [language, setLanguage] = useState<Language>('en');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showSettings, setShowSettings] = useState(true);
  const [showLog, setShowLog] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [errorSquareId, setErrorSquareId] = useState<number | null>(null);

  const t = translations[language];

  // Initialize Game
  const initGame = useCallback(() => {
    const initialBlocks = generateBlocks(n);
    const initialSquares = generateSquares(n);
    setErrorSquareId(null);
    
    let p1Type: PlayerType = 'human';
    let p2Type: PlayerType = 'human';
    let currentPlayer: Player = 'player1';

    switch (mode) {
      case 'alone':
        p1Type = 'human';
        p2Type = 'human';
        break;
      case 'human-human':
        p1Type = 'human';
        p2Type = 'human';
        break;
      case 'computer-human':
        p1Type = 'ai';
        p2Type = 'human';
        currentPlayer = 'player1';
        break;
      case 'human-computer':
        p1Type = 'human';
        p2Type = 'ai';
        currentPlayer = 'player1';
        break;
    }

    setGameState({
      n,
      mode,
      players: {
        player1: { type: p1Type, score: 0, name: p1Type === 'ai' ? t.computer : t.player1 },
        player2: { type: p2Type, score: 0, name: p2Type === 'ai' ? t.computer : (mode === 'alone' ? t.exercise : t.player2) },
      },
      currentPlayer,
      blocks: initialBlocks,
      squares: initialSquares,
      selectedBlockId: null,
      gameOver: false,
      history: [],
      lastMove: null,
    });
    setShowSettings(false);
  }, [n, mode, t]);

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
        
        const nextPlayer = prev.mode === 'alone' ? 'player1' : (prev.currentPlayer === 'player1' ? 'player2' : 'player1');

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
          history: [...prev.history, `${prev.players[prev.currentPlayer].name}: ${block.i}×${block.j} = ${block.product}`]
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
    } else {
      // Incorrect Placement - Flash Red
      setErrorSquareId(squareId);
      setTimeout(() => setErrorSquareId(null), 400);
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
      
      if (lastMove) {
        // (1) If opponent played a square (d,d), react with another square (e,e) if possible
        if (lastMove.i === lastMove.j) {
          const availableSquares = availableBlocks.filter(b => b.i === b.j);
          if (availableSquares.length > 0) {
            candidates.push(...availableSquares);
          }
        }

        // (2) React to (i,j) with another (k,l) such that k*l = i*j
        const sameProductBlocks = availableBlocks.filter(b => b.product === lastMove.product);
        if (sameProductBlocks.length > 0) {
          // Add all same-product blocks. Picking randomly from these is "less transparent" than always mirroring.
          candidates.push(...sameProductBlocks);
        }
      }

      // To be less transparent, we pick from strategic candidates 85% of the time.
      // 15% of the time we pick a random block to mask the strategy.
      if (candidates.length > 0 && Math.random() > 0.15) {
        chosenBlock = candidates[Math.floor(Math.random() * candidates.length)];
      } else {
        // Default: pick a square if available (to get rid of odd sets), else random
        const availableSquares = availableBlocks.filter(b => b.i === b.j);
        if (availableSquares.length > 0 && Math.random() > 0.2) {
          chosenBlock = availableSquares[Math.floor(Math.random() * availableSquares.length)];
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
      <div className="min-h-screen flex items-center justify-center p-4 font-sans bg-[var(--color-bg-main)]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[var(--color-bg-secondary)] rounded-2xl shadow-2xl p-8 max-w-md w-full border border-[var(--color-gray-700)]"
        >
          <div className="flex items-center gap-4 mb-8">
            {/* Custom IVO Logo */}
            <div className="font-mono leading-none select-none text-xl bg-black border border-white p-2 rounded">
              <div className="flex gap-2 mb-1">
                <span className="text-[var(--color-vivid-red)] font-black">I</span>
                <span className="text-[var(--color-vivid-green)] font-black">V</span>
                <span className="text-[var(--color-vivid-blue)] font-black">O</span>
              </div>
              <div className="flex justify-center mb-1">
                <span className="text-white font-black">x</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--color-vivid-cyan)] font-black">O</span>
                <span className="text-[var(--color-vivid-magenta)] font-black">^</span>
                <span className="text-[var(--color-vivid-yellow)] font-black">I</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-text-main)]">{t.title}</h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-widest mb-3">{t.language}</label>
              <div className="grid grid-cols-5 gap-2">
                {(['en', 'nl', 'fr', 'es', 'it'] as Language[]).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    title={t.ttLanguage}
                    className={`py-2 rounded-lg font-bold transition-all border text-xs ${
                      language === lang 
                        ? 'bg-[var(--color-soft-magenta)] border-[var(--color-soft-magenta)] text-[var(--color-pure-black)]' 
                        : 'bg-transparent border-[var(--color-gray-700)] text-[var(--color-gray-300)] hover:border-[var(--color-gray-500)]'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-widest mb-3">{t.boardSize}</label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 8, 9, 10, 11, 12, 13].map(val => (
                  <button
                    key={val}
                    onClick={() => setN(val)}
                    title={t.ttBoardSize}
                    className={`py-2 rounded-lg font-bold transition-all border ${
                      n === val 
                        ? 'bg-[var(--color-soft-blue)] border-[var(--color-soft-blue)] text-[var(--color-pure-black)]' 
                        : 'bg-transparent border-[var(--color-gray-700)] text-[var(--color-gray-300)] hover:border-[var(--color-gray-500)]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-widest mb-3">{t.gameMode}</label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { id: 'alone', label: t.modeAlone, icon: <User size={18} /> },
                  { id: 'human-human', label: t.modeHumanHuman, icon: <User size={18} /> },
                  { id: 'computer-human', label: t.modeAiHuman, icon: <Cpu size={18} /> },
                  { id: 'human-computer', label: t.modeHumanAi, icon: <Cpu size={18} /> }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id as GameMode)}
                    title={t.ttGameMode}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg font-bold transition-all border ${
                      mode === m.id 
                        ? 'bg-[var(--color-soft-blue)] border-[var(--color-soft-blue)] text-[var(--color-pure-black)]' 
                        : 'bg-transparent border-[var(--color-gray-700)] text-[var(--color-gray-300)] hover:border-[var(--color-gray-500)]'
                    }`}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={initGame}
              title={t.ttStart}
              className="w-full bg-[var(--color-soft-green)] hover:opacity-90 text-[var(--color-pure-black)] py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 mt-4"
            >
              {t.startGame} <ChevronRight size={20} />
            </button>
          </div>
          {/* Version Info */}
          <div className="mt-8 pt-4 border-t border-[var(--color-gray-700)] text-center space-y-2">
            <button 
              onClick={() => {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let registration of registrations) {
                      registration.unregister();
                    }
                    window.location.reload();
                  });
                } else {
                  window.location.reload();
                }
              }}
              title={t.ttForceUpdate}
              className="text-[10px] font-mono text-[var(--color-gray-500)] hover:text-[var(--color-gray-100)] transition-colors uppercase tracking-widest flex items-center justify-center gap-1 mx-auto"
            >
              <RotateCcw size={10} /> {t.forceUpdate}
            </button>
            <p className="text-[10px] font-mono text-[var(--color-gray-500)] uppercase tracking-widest">
              v2.1.2
            </p>
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
    <div className="min-h-screen p-4 md:p-8 font-sans text-[var(--color-text-main)]">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div className="flex items-center gap-6">
          {/* Custom IVO Logo */}
          <div className="font-mono leading-none select-none bg-black border border-white p-2 rounded">
            <div className="flex gap-2 mb-1">
              <span className="text-[var(--color-vivid-red)] font-black">I</span>
              <span className="text-[var(--color-vivid-green)] font-black">V</span>
              <span className="text-[var(--color-vivid-blue)] font-black">O</span>
            </div>
            <div className="flex justify-center mb-1">
              <span className="text-white font-black">x</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[var(--color-vivid-cyan)] font-black">O</span>
              <span className="text-[var(--color-vivid-magenta)] font-black">^</span>
              <span className="text-[var(--color-vivid-yellow)] font-black">I</span>
            </div>
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase">{t.title}</h1>
        </div>

        <div className="flex gap-2">
          <div className="flex items-center bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-gray-700)] overflow-hidden">
            <button 
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
              title={t.ttZoomOut}
              className="p-2 hover:bg-[var(--color-gray-700)] text-[var(--color-text-main)] transition-all border-r border-[var(--color-gray-700)]"
            >
              <ZoomOut size={16} />
            </button>
            <button 
              onClick={() => setZoom(1)}
              title={t.ttResetZoom}
              className="p-2 hover:bg-[var(--color-gray-700)] text-[var(--color-text-main)] transition-all border-r border-[var(--color-gray-700)]"
            >
              <Maximize size={16} />
            </button>
            <button 
              onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
              title={t.ttZoomIn}
              className="p-2 hover:bg-[var(--color-gray-700)] text-[var(--color-text-main)] transition-all"
            >
              <ZoomIn size={16} />
            </button>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            title={t.ttSettings}
            className="p-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-gray-700)] rounded-lg border border-[var(--color-gray-700)] text-[var(--color-text-main)]"
          >
            <Settings size={18} />
          </button>
          <button 
            onClick={initGame}
            title={t.ttReset}
            className="p-2 bg-[var(--color-bg-secondary)] hover:bg-[var(--color-gray-700)] rounded-lg border border-[var(--color-gray-700)] text-[var(--color-text-main)]"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Scoreboard */}
      <div className={`max-w-7xl mx-auto grid gap-4 mb-8 ${gameState.mode === 'alone' ? 'grid-cols-1' : 'grid-cols-2'}`}>
        <div className={`p-4 rounded-xl border transition-all ${isP1Turn ? 'bg-[var(--color-bg-tertiary)] border-[var(--color-soft-blue)]' : 'bg-[var(--color-bg-secondary)] border-[var(--color-gray-700)] opacity-60'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {p1.type === 'ai' ? <Cpu size={16} /> : <User size={16} />}
              <span className="font-bold text-sm uppercase">{gameState.mode === 'alone' ? t.exerciseMode : p1.name}</span>
            </div>
            <span className="text-2xl font-bold">{p1.score}</span>
          </div>
        </div>

        {gameState.mode !== 'alone' && (
          <div className={`p-4 rounded-xl border transition-all ${!isP1Turn ? 'bg-[var(--color-bg-tertiary)] border-[var(--color-soft-magenta)]' : 'bg-[var(--color-bg-secondary)] border-[var(--color-gray-700)] opacity-60'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {p2.type === 'ai' ? <Cpu size={16} /> : <User size={16} />}
                <span className="font-bold text-sm uppercase">{p2.name}</span>
              </div>
              <span className="text-2xl font-bold">{p2.score}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto">
        <div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: 'top center'
          }}
        >
          {/* Left: The Box */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-gray-500)]">{t.theBox}</h2>
              <span className="text-xs font-bold text-[var(--color-gray-500)]">
                {gameState.blocks.filter(b => !b.placed).length} {t.blocks}
              </span>
            </div>
            
            <div 
              className="grid gap-1 bg-[var(--color-bg-secondary)] p-2 rounded-lg border border-[var(--color-gray-700)]"
              style={{ gridTemplateColumns: `repeat(${gameState.n}, minmax(0, 1fr))` }}
            >
              {gameState.blocks.map(block => (
                <button
                  key={block.id}
                  disabled={block.placed || (gameState.players[gameState.currentPlayer].type === 'ai')}
                  onClick={() => selectBlock(block.id)}
                  title={t.ttBlock}
                  className={`
                    aspect-square flex items-center justify-center text-[10px] font-bold transition-all border
                    ${block.placed ? 
                      (gameState.lastMove?.blockId === block.id ? 'bg-[var(--color-last-move)] border-[var(--color-pure-white)] text-[var(--color-pure-black)] z-10' : 'bg-[var(--color-bg-main)] border-[var(--color-gray-900)] text-transparent') 
                      : 
                      gameState.selectedBlockId === block.id ? 'bg-[var(--color-soft-yellow)] border-[var(--color-pure-white)] text-[var(--color-pure-black)] scale-110 z-10 shadow-xl' : 
                      'bg-[var(--color-block-unused)] border-[var(--color-soft-blue)]/30 text-[var(--color-pure-black)] hover:bg-[var(--color-soft-blue)]/80'}
                  `}
                >
                  {!block.placed || gameState.lastMove?.blockId === block.id ? block.id : ''}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Field Board */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-[var(--color-gray-500)]">{t.theField}</h2>
            
            <div 
              className="grid gap-1 bg-[var(--color-bg-secondary)] p-2 rounded-lg border border-[var(--color-gray-700)]"
              style={{ 
                gridTemplateColumns: `repeat(${gameState.n}, minmax(0, 1fr))` 
              }}
            >
              {gameState.squares.map(square => (
                <button
                  key={square.id}
                  disabled={gameState.players[gameState.currentPlayer].type === 'ai'}
                  onClick={() => selectSquare(square.id)}
                  title={t.ttSquare}
                  className={`
                    aspect-square flex items-center justify-center text-[10px] font-bold transition-all border
                    ${square.id === errorSquareId ? 'bg-[var(--color-soft-red)] border-[var(--color-pure-white)] text-[var(--color-pure-black)] z-20 scale-110' : 
                      square.highlighted ? 
                      'bg-[var(--color-square-used)] border-[var(--color-soft-green)]/30 text-[var(--color-pure-black)]' : 
                      'bg-[var(--color-bg-main)] border-[var(--color-gray-900)] text-[var(--color-gray-500)] hover:text-[var(--color-gray-100)] hover:border-[var(--color-gray-700)]'}
                  `}
                >
                  {square.value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Game Log */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-gray-700)] overflow-hidden">
          <button 
            onClick={() => setShowLog(!showLog)}
            title={t.ttLog}
            className="w-full p-4 flex items-center justify-between hover:bg-[var(--color-gray-700)] transition-colors"
          >
            <h3 className="text-xs font-bold text-[var(--color-gray-500)] uppercase tracking-widest flex items-center gap-2">
              <History size={14} /> {t.log}
            </h3>
            <div className="text-[var(--color-gray-500)]">
              {showLog ? <ChevronRight size={16} className="rotate-90 transition-transform" /> : <ChevronRight size={16} className="transition-transform" />}
            </div>
          </button>
          
          <AnimatePresence>
            {showLog && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-[var(--color-gray-700)]"
              >
                <div className="p-4 h-32 overflow-y-auto space-y-1 pr-2 custom-scrollbar text-[10px] font-mono">
                  {gameState.history.slice().reverse().map((log, i) => (
                    <div key={i} className="text-[var(--color-gray-500)] border-b border-[var(--color-gray-900)] pb-1">
                      {log}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState.gameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-[var(--color-pure-black)]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-[var(--color-bg-secondary)] rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-[var(--color-gray-700)]"
            >
              <div className="w-16 h-16 bg-[var(--color-soft-yellow)] text-[var(--color-pure-black)] rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy size={32} />
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-text-main)] mb-2">{t.gameOver}</h2>
              <p className="text-[var(--color-gray-300)] mb-6 font-bold">
                {p1.score > p2.score ? `${p1.name} ${t.wins}` : p2.score > p1.score ? `${p2.name} ${t.wins}` : t.draw}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-[var(--color-bg-main)] p-4 rounded-lg border border-[var(--color-gray-700)]">
                  <p className="text-[10px] font-bold text-[var(--color-gray-500)] uppercase mb-1">{p1.name}</p>
                  <p className="text-xl font-bold">{p1.score}</p>
                </div>
                <div className="bg-[var(--color-bg-main)] p-4 rounded-lg border border-[var(--color-gray-700)]">
                  <p className="text-[10px] font-bold text-[var(--color-gray-500)] uppercase mb-1">{p2.name}</p>
                  <p className="text-xl font-bold">{p2.score}</p>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                title={t.ttPlayAgain}
                className="w-full bg-[var(--color-soft-blue)] text-[var(--color-pure-black)] py-3 rounded-lg font-bold transition-all"
              >
                {t.playAgain}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Footer */}
      <div className="max-w-7xl mx-auto mt-8 pb-8 flex justify-between items-center text-[10px] font-mono text-[var(--color-gray-500)] uppercase tracking-widest">
        <p>© 2026 Multiplication Quest</p>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                  for (let registration of registrations) {
                    registration.unregister();
                  }
                  window.location.reload();
                });
              } else {
                window.location.reload();
              }
            }}
            title={t.ttForceUpdate}
            className="hover:text-[var(--color-gray-100)] transition-colors flex items-center gap-1"
          >
            <RotateCcw size={10} /> {t.forceUpdate}
          </button>
          <p>v2.1.2</p>
        </div>
      </div>
    </div>
  );
}
