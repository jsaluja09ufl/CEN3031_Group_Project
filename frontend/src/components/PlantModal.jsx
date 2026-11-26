import { useState, useEffect } from 'react';
import {
  getPlantState,
  PLANT_STAGES,
  waterPlant,
  plantNewSeed
} from '../utils/plantState';

function PlantSvg({ stageIndex, isWatering }) {
  // Return sleek responsive SVG illustrations for each stage
  return (
    <div className={`plant-svg-stage-container ${isWatering ? 'is-watering' : ''}`}>
      {isWatering && (
        <div className="water-drop-wrapper">
          <span className="water-drop drop-1">💧</span>
          <span className="water-drop drop-2">💧</span>
          <span className="water-drop drop-3">💧</span>
        </div>
      )}

      {stageIndex === 0 && (
        /* Stage 0: Sprouting Seed */
        <svg viewBox="0 0 200 200" className="plant-svg plant-sway">
          {/* Pot */}
          <ellipse cx="100" cy="170" rx="42" ry="10" fill="#a16207" opacity="0.25" />
          <path d="M 68 125 L 75 168 Q 100 176 125 168 L 132 125 Z" fill="#d97706" />
          <path d="M 64 120 Q 100 114 136 120 L 136 126 Q 100 120 64 126 Z" fill="#b45309" />
          {/* Soil */}
          <ellipse cx="100" cy="125" rx="32" ry="7" fill="#451a03" />
          {/* Seed */}
          <ellipse cx="100" cy="122" rx="7" ry="5" fill="#78350f" />
          {/* Tiny Sprout */}
          <path d="M 100 122 Q 98 102 92 90" stroke="#10b981" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Leaf 1 */}
          <path d="M 92 90 Q 75 88 82 78 Q 96 82 92 90 Z" fill="#34d399" />
          {/* Leaf 2 */}
          <path d="M 92 90 Q 108 86 106 75 Q 94 78 92 90 Z" fill="#10b981" />
          {/* Morning Dew Sparkle */}
          <circle cx="86" cy="80" r="2.5" fill="#67e8f9" opacity="0.9" />
        </svg>
      )}

      {stageIndex === 1 && (
        /* Stage 1: Baby Seedling */
        <svg viewBox="0 0 200 200" className="plant-svg plant-sway">
          <ellipse cx="100" cy="172" rx="46" ry="11" fill="#a16207" opacity="0.25" />
          <path d="M 65 120 L 73 170 Q 100 178 127 170 L 135 120 Z" fill="#ea580c" />
          <path d="M 60 114 Q 100 108 140 114 L 140 121 Q 100 115 60 121 Z" fill="#c2410c" />
          <ellipse cx="100" cy="120" rx="35" ry="8" fill="#451a03" />
          {/* Stem */}
          <path d="M 100 120 Q 99 90 96 68" stroke="#059669" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          {/* Lower leaves */}
          <path d="M 98 95 Q 75 92 78 80 Q 96 86 98 95 Z" fill="#10b981" />
          <path d="M 98 88 Q 122 84 120 72 Q 102 78 98 88 Z" fill="#34d399" />
          {/* Top leaves */}
          <path d="M 96 68 Q 80 50 94 42 Q 102 55 96 68 Z" fill="#6ee7b7" />
          <path d="M 96 68 Q 115 54 104 42 Q 94 54 96 68 Z" fill="#10b981" />
          <circle cx="94" cy="50" r="2" fill="#e0f2fe" />
        </svg>
      )}

      {stageIndex === 2 && (
        /* Stage 2: Thriving Foliage */
        <svg viewBox="0 0 200 200" className="plant-svg plant-sway">
          <ellipse cx="100" cy="175" rx="50" ry="12" fill="#0f172a" opacity="0.18" />
          {/* Ceramic Pot */}
          <path d="M 62 115 L 72 172 Q 100 180 128 172 L 138 115 Z" fill="#0284c7" />
          <path d="M 58 108 Q 100 102 142 108 L 142 116 Q 100 110 58 116 Z" fill="#0369a1" />
          {/* Pot geometric accent line */}
          <path d="M 67 136 Q 100 142 133 136" stroke="#bae6fd" strokeWidth="2.5" fill="none" opacity="0.6" />
          <ellipse cx="100" cy="114" rx="38" ry="9" fill="#382414" />
          {/* Multiple thriving branches & leaves */}
          <path d="M 100 114 Q 85 85 64 68" stroke="#047857" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M 100 114 Q 112 85 136 68" stroke="#047857" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M 100 114 Q 99 75 98 50" stroke="#059669" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          {/* Leaf clusters */}
          <path d="M 64 68 Q 44 60 52 46 Q 72 52 64 68 Z" fill="#10b981" />
          <path d="M 75 78 Q 58 84 62 96 Q 78 88 75 78 Z" fill="#059669" />
          <path d="M 136 68 Q 156 60 148 46 Q 128 52 136 68 Z" fill="#10b981" />
          <path d="M 125 78 Q 142 84 138 96 Q 122 88 125 78 Z" fill="#059669" />
          <path d="M 98 50 Q 80 30 96 22 Q 106 36 98 50 Z" fill="#34d399" />
          <path d="M 98 50 Q 118 32 108 22 Q 96 36 98 50 Z" fill="#6ee7b7" />
        </svg>
      )}

      {stageIndex === 3 && (
        /* Stage 3: Blossoming Shrub */
        <svg viewBox="0 0 200 200" className="plant-svg plant-sway">
          <ellipse cx="100" cy="176" rx="52" ry="12" fill="#0f172a" opacity="0.18" />
          {/* Elegant Terracotta Planter */}
          <path d="M 60 112 L 70 172 Q 100 180 130 172 L 140 112 Z" fill="#be185d" />
          <path d="M 56 105 Q 100 99 144 105 L 144 113 Q 100 107 56 113 Z" fill="#9d174d" />
          <ellipse cx="100" cy="111" rx="40" ry="9" fill="#29180b" />
          {/* Stems */}
          <path d="M 100 111 Q 78 80 60 62" stroke="#047857" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M 100 111 Q 122 80 140 62" stroke="#047857" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M 100 111 Q 100 70 98 44" stroke="#047857" strokeWidth="4" fill="none" strokeLinecap="round" />
          {/* Foliage */}
          <path d="M 60 62 Q 40 56 50 42 Q 68 48 60 62 Z" fill="#10b981" />
          <path d="M 140 62 Q 160 56 150 42 Q 132 48 140 62 Z" fill="#10b981" />
          <path d="M 98 44 Q 82 28 96 20 Q 106 32 98 44 Z" fill="#34d399" />
          {/* Blossoms */}
          {/* Blossom 1 (Center) */}
          <g transform="translate(98, 40)">
            <circle cx="0" cy="-6" r="5" fill="#f472b6" />
            <circle cx="6" cy="-2" r="5" fill="#f472b6" />
            <circle cx="4" cy="5" r="5" fill="#f472b6" />
            <circle cx="-4" cy="5" r="5" fill="#f472b6" />
            <circle cx="-6" cy="-2" r="5" fill="#f472b6" />
            <circle cx="0" cy="0" r="3.5" fill="#fef08a" />
          </g>
          {/* Blossom 2 (Left) */}
          <g transform="translate(62, 58)">
            <circle cx="0" cy="-5" r="4.5" fill="#fb7185" />
            <circle cx="5" cy="-1" r="4.5" fill="#fb7185" />
            <circle cx="3" cy="4" r="4.5" fill="#fb7185" />
            <circle cx="-3" cy="4" r="4.5" fill="#fb7185" />
            <circle cx="-5" cy="-1" r="4.5" fill="#fb7185" />
            <circle cx="0" cy="0" r="3" fill="#fef08a" />
          </g>
          {/* Blossom 3 (Right) */}
          <g transform="translate(138, 58)">
            <circle cx="0" cy="-5" r="4.5" fill="#fb7185" />
            <circle cx="5" cy="-1" r="4.5" fill="#fb7185" />
            <circle cx="3" cy="4" r="4.5" fill="#fb7185" />
            <circle cx="-3" cy="4" r="4.5" fill="#fb7185" />
            <circle cx="-5" cy="-1" r="4.5" fill="#fb7185" />
            <circle cx="0" cy="0" r="3" fill="#fef08a" />
          </g>
          {/* Sparkles */}
          <text x="115" y="35" fontSize="11" fill="#facc15">✨</text>
          <text x="45" y="75" fontSize="10" fill="#facc15">✨</text>
        </svg>
      )}

      {stageIndex === 4 && (
        /* Stage 4: Mighty Tree */
        <svg viewBox="0 0 200 200" className="plant-svg plant-sway">
          {/* Grass & Hill */}
          <ellipse cx="100" cy="178" rx="64" ry="14" fill="#0f172a" opacity="0.18" />
          <path d="M 32 178 Q 100 162 168 178 Q 100 186 32 178 Z" fill="#15803d" />
          {/* Tree Trunk */}
          <path d="M 88 172 Q 94 135 84 105 Q 100 114 116 105 Q 106 135 112 172 Q 100 176 88 172 Z" fill="#78350f" />
          {/* Root Flairs */}
          <path d="M 88 172 Q 80 175 72 176" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          <path d="M 112 172 Q 120 175 128 176" stroke="#78350f" strokeWidth="4" strokeLinecap="round" />
          {/* Canopy Layers */}
          <circle cx="70" cy="92" r="28" fill="#15803d" />
          <circle cx="130" cy="92" r="28" fill="#15803d" />
          <circle cx="100" cy="68" r="35" fill="#16a34a" />
          <circle cx="78" cy="74" r="24" fill="#22c55e" />
          <circle cx="122" cy="74" r="24" fill="#22c55e" />
          <circle cx="100" cy="52" r="22" fill="#4ade80" />
          {/* Golden Mastery Fruit/Orbs */}
          <circle cx="85" cy="62" r="4.5" fill="#eab308" />
          <circle cx="115" cy="62" r="4.5" fill="#eab308" />
          <circle cx="100" cy="80" r="4.5" fill="#eab308" />
          <circle cx="72" cy="90" r="4.5" fill="#eab308" />
          <circle cx="128" cy="90" r="4.5" fill="#eab308" />
          {/* Crown of light */}
          <text x="88" y="24" fontSize="16">👑</text>
        </svg>
      )}
    </div>
  );
}

export default function PlantModal({ isOpen, onClose, currentUser }) {
  const [plant, setPlant] = useState(() => getPlantState(currentUser));
  const [wateringAnim, setWateringAnim] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setPlant(getPlantState(currentUser));
    window.addEventListener('plant-updated', handleUpdate);
    window.addEventListener('plant-growth-celebration', handleUpdate);

    return () => {
      window.removeEventListener('plant-updated', handleUpdate);
      window.removeEventListener('plant-growth-celebration', handleUpdate);
    };
  }, [currentUser]);

  if (!isOpen) return null;

  const currentStage = PLANT_STAGES[plant.stageIndex] || PLANT_STAGES[0];
  const isMaxStage = plant.stageIndex === PLANT_STAGES.length - 1;
  const progressPercent = isMaxStage
    ? 100
    : Math.min(
        Math.round((plant.tasksInCurrentStage / currentStage.tasksRequired) * 100),
        100
      );

  const handleWaterClick = () => {
    setWateringAnim(true);
    waterPlant(currentUser);
    setTimeout(() => {
      setWateringAnim(false);
    }, 1000);
  };

  const handlePlantNewSeed = () => {
    plantNewSeed(currentUser);
  };

  return (
    <div
      className="plant-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="plant-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="plant-modal-header">
          <div className="plant-modal-title-group">
            <span className="plant-modal-badge">
              Level {currentStage.level}
            </span>
            <h3 className="plant-modal-title">{currentStage.name}</h3>
          </div>
          <button
            type="button"
            className="plant-modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {/* Plant Illustration */}
        <div className="plant-modal-body">
          <PlantSvg stageIndex={plant.stageIndex} isWatering={wateringAnim} />

          {/* Motivational description & quote */}
          <p className="plant-stage-desc">{currentStage.description}</p>
          <blockquote className="plant-stage-quote">
            &ldquo;{currentStage.quote}&rdquo;
          </blockquote>

          {/* Progress bar */}
          <div className="plant-progress-section">
            <div className="plant-progress-label-row">
              <span className="plant-progress-title">
                {isMaxStage ? 'Forest Mastery Reached!' : 'Growth to Next Stage'}
              </span>
              <span className="plant-progress-ratio">
                {isMaxStage
                  ? '100%'
                  : `${plant.tasksInCurrentStage} / ${currentStage.tasksRequired} tasks`}
              </span>
            </div>
            <div className="plant-progress-track">
              <div
                className={`plant-progress-fill ${isMaxStage ? 'is-max' : ''}`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {!isMaxStage && (
              <p className="plant-progress-hint">
                💡 Finish {currentStage.tasksRequired - plant.tasksInCurrentStage} more{' '}
                {currentStage.tasksRequired - plant.tasksInCurrentStage === 1 ? 'task or habit' : 'tasks or habits'} to level up to{' '}
                <strong>{PLANT_STAGES[plant.stageIndex + 1]?.name}</strong>!
              </p>
            )}
          </div>

          {/* Gamification Stats */}
          <div className="plant-stats-grid">
            <div className="plant-stat-box">
              <span className="plant-stat-icon">🎯</span>
              <span className="plant-stat-value">{plant.totalTasksCompleted}</span>
              <span className="plant-stat-label">Tasks Finished</span>
            </div>
            <div className="plant-stat-box">
              <span className="plant-stat-icon">🌳</span>
              <span className="plant-stat-value">{plant.treesGrown}</span>
              <span className="plant-stat-label">Trees Grown</span>
            </div>
            <div className="plant-stat-box">
              <span className="plant-stat-icon">💧</span>
              <span className="plant-stat-value">{plant.waterDrops}</span>
              <span className="plant-stat-label">Water Drops</span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="plant-modal-footer">
          <button
            type="button"
            className="plant-water-btn"
            onClick={handleWaterClick}
            disabled={wateringAnim}
          >
            💧 Water Plant
          </button>

          {isMaxStage && (
            <button
              type="button"
              className="plant-new-seed-btn"
              onClick={handlePlantNewSeed}
            >
              🌱 Plant a New Seed
            </button>
          )}

          <button
            type="button"
            className="btn-submit"
            style={{ width: 'auto', background: '#4b5563', margin: 0 }}
            onClick={onClose}
          >
            Keep Growing
          </button>
        </div>
      </div>
    </div>
  );
}
