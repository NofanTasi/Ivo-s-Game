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
  Maximize
} from 'lucide-react';

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

const MIN_N = 9;
const MAX_N = 12;

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

      setGameState(prev => {
        if (!prev) return null;
        const newBlocks = prev.blocks.map(b => b.id === block.id ? { ...b, placed: true } : b);
        const newSquares = prev.squares.map(s => s.id === square.id ? { 
          ...s, 
          highlighted: true, 
          blockCount: s.blockCount + 1 
        } : s);
        
        const nextPlayer = prev.currentPlayer === 'player1' ? 'player2' : 'player1';
        const allPlaced = newBlocks.every(b => b.placed);

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full border border-slate-100"
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
              <Trophy className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Multiplication Quest</h1>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Board Size (N)</label>
              <div className="flex gap-2">
                {[9, 10, 11, 12].map(val => (
                  <button
                    key={val}
                    onClick={() => setN(val)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      n === val 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {val}x{val}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Opponent</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setP2Type('ai')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    p2Type === 'ai' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Cpu size={18} /> Computer
                </button>
                <button
                  onClick={() => setP2Type('human')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    p2Type === 'human' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <User size={18} /> Human
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">Who Starts?</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setStartingPlayer('player1')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    startingPlayer === 'player1' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <User size={18} /> Me
                </button>
                <button
                  onClick={() => setStartingPlayer('player2')}
                  className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                    startingPlayer === 'player2' 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {p2Type === 'ai' ? <Cpu size={18} /> : <User size={18} />} Opponent
                </button>
              </div>
            </div>

            <button
              onClick={initGame}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-4"
            >
              Start Adventure <ChevronRight size={20} />
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

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Trophy className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Multiplication Quest</h1>
          </div>

          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
            <div className={`px-6 py-3 rounded-xl transition-all flex items-center gap-3 ${isP1Turn ? 'bg-indigo-50 border-2 border-indigo-200' : 'opacity-50'}`}>
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <User className="text-white w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{p1.name}</p>
                <p className="text-xl font-black">{p1.score}</p>
              </div>
            </div>
            
            <div className="text-slate-300 font-bold text-xl">VS</div>

            <div className={`px-6 py-3 rounded-xl transition-all flex items-center gap-3 ${!isP1Turn ? 'bg-rose-50 border-2 border-rose-200' : 'opacity-50'}`}>
              <div>
                <p className="text-xs font-bold text-rose-600 text-right uppercase tracking-wider">{p2.name}</p>
                <p className="text-xl font-black text-right">{p2.score}</p>
              </div>
              <div className="bg-rose-600 p-1.5 rounded-lg">
                {p2.type === 'ai' ? <Cpu className="text-white w-4 h-4" /> : <User className="text-white w-4 h-4" />}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex items-center bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <button 
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                className="p-3 hover:bg-slate-50 text-slate-600 transition-all border-r border-slate-200"
                title="Zoom Out"
              >
                <ZoomOut size={18} />
              </button>
              <button 
                onClick={() => setZoom(1)}
                className="p-3 hover:bg-slate-50 text-slate-600 transition-all border-r border-slate-200"
                title="Reset Zoom"
              >
                <Maximize size={18} />
              </button>
              <button 
                onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                className="p-3 hover:bg-slate-50 text-slate-600 transition-all"
                title="Zoom In"
              >
                <ZoomIn size={18} />
              </button>
            </div>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-600 transition-all shadow-sm"
              title="Settings"
            >
              <Settings size={20} />
            </button>
            <button 
              onClick={initGame}
              className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-600 transition-all shadow-sm"
              title="Restart"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-7xl mx-auto overflow-auto custom-scrollbar">
        <div 
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 transition-transform duration-200 ease-out"
          style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: 'top center',
            marginBottom: `${(zoom - 1) * 100}%` // Adjust margin to prevent overlap when zoomed
          }}
        >
        
        {/* Left: Box Board */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="text-indigo-600" size={20} />
              The Box <span className="text-slate-400 font-medium text-sm">Pick a block</span>
            </h2>
            <div className="bg-slate-200 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
              {gameState.blocks.filter(b => !b.placed).length} blocks left
            </div>
          </div>
          
          <div 
            className="grid gap-2 bg-white p-4 rounded-3xl shadow-sm border border-slate-100"
            style={{ gridTemplateColumns: `repeat(${gameState.n}, minmax(0, 1fr))` }}
          >
            {gameState.blocks.map(block => (
              <button
                key={block.id}
                disabled={block.placed || (gameState.players[gameState.currentPlayer].type === 'ai')}
                onClick={() => selectBlock(block.id)}
                className={`
                  aspect-square flex items-center justify-center text-[10px] md:text-xs font-bold rounded-lg transition-all
                  ${block.placed ? 
                    (gameState.lastMove?.blockId === block.id ? 'bg-rose-600 text-rose-100 shadow-lg ring-2 ring-rose-400 z-10' : 'bg-slate-800 text-slate-600 shadow-inner opacity-40') 
                    : 
                    gameState.selectedBlockId === block.id ? 'bg-indigo-600 text-white shadow-lg scale-110 z-10' : 
                    'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:scale-105 active:scale-95'}
                `}
              >
                {block.id}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Field Board */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="text-emerald-600" size={20} />
              The Field <span className="text-slate-400 font-medium text-sm">Place on product</span>
            </h2>
            <div className="flex gap-2">
               <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                 <div className="w-3 h-3 bg-emerald-500 rounded-sm"></div> Highlighted
               </div>
            </div>
          </div>

          <div 
            className="grid gap-2 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 relative"
            style={{ gridTemplateColumns: `repeat(${gameState.n}, minmax(0, 1fr))` }}
          >
            {gameState.squares.map(square => (
              <button
                key={square.id}
                disabled={!gameState.selectedBlockId || (gameState.players[gameState.currentPlayer].type === 'ai')}
                onClick={() => selectSquare(square.id)}
                className={`
                  aspect-square flex items-center justify-center text-xs md:text-sm font-bold rounded-lg transition-all relative
                  ${square.highlighted ? 'bg-emerald-500 text-white shadow-inner' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}
                  ${gameState.selectedBlockId ? 'cursor-pointer hover:ring-2 hover:ring-indigo-400' : 'cursor-default'}
                `}
              >
                {square.value}
                {square.blockCount > 1 && (
                  <span className="absolute -top-1 -right-1 bg-amber-400 text-amber-900 text-[8px] px-1 rounded-full border border-white">
                    {square.blockCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>

      {/* Footer / History */}
      <div className="max-w-7xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 md:col-span-2">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Info size={16} /> Game Log
          </h3>
          <div className="h-32 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {gameState.history.length === 0 ? (
              <p className="text-slate-300 italic text-sm">No moves yet...</p>
            ) : (
              gameState.history.slice().reverse().map((log, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-600 border-b border-slate-50 pb-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${log.includes('player1') ? 'bg-indigo-400' : 'bg-rose-400'}`}></div>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-indigo-900 text-white p-6 rounded-3xl shadow-xl shadow-indigo-100 flex flex-col justify-center">
          <h3 className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-2">Current Turn</h3>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isP1Turn ? 'bg-indigo-600' : 'bg-rose-600'}`}>
              {isP1Turn ? <User size={24} /> : (p2.type === 'ai' ? <Cpu size={24} /> : <User size={24} />)}
            </div>
            <div>
              <p className="text-xl font-bold">{gameState.currentPlayer === 'player1' ? p1.name : p2.name}</p>
              <p className="text-indigo-300 text-sm">
                {gameState.selectedBlockId ? 'Place the block!' : 'Select a block from the box'}
              </p>
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
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy size={40} />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Game Over!</h2>
              <p className="text-slate-500 mb-8">
                {p1.score > p2.score ? `${p1.name} wins!` : p2.score > p1.score ? `${p2.name} wins!` : "It's a draw!"}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-indigo-50 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-indigo-600 uppercase">{p1.name}</p>
                  <p className="text-2xl font-black">{p1.score}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-rose-600 uppercase">{p2.name}</p>
                  <p className="text-2xl font-black">{p2.score}</p>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(true)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-indigo-200 transition-all"
              >
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
