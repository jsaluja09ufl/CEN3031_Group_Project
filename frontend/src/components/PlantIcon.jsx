import { useState, useEffect } from 'react';
import { getPlantState, PLANT_STAGES } from '../utils/plantState';

export default function PlantIcon({ currentUser, onClick }) {
  const [plant, setPlant] = useState(() => getPlantState(currentUser));
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setPlant(getPlantState(currentUser));
    };

    const handleCelebration = () => {
      setPlant(getPlantState(currentUser));
      setBouncing(true);
      setTimeout(() => setBouncing(false), 900);
    };

    window.addEventListener('plant-updated', handleUpdate);
    window.addEventListener('plant-growth-celebration', handleCelebration);

    return () => {
      window.removeEventListener('plant-updated', handleUpdate);
      window.removeEventListener('plant-growth-celebration', handleCelebration);
    };
  }, [currentUser]);

  const currentStage = PLANT_STAGES[plant.stageIndex] || PLANT_STAGES[0];
  const isMax = plant.stageIndex === PLANT_STAGES.length - 1;
  const progressPercent = isMax
    ? 100
    : Math.min(Math.round((plant.tasksInCurrentStage / currentStage.tasksRequired) * 100), 100);

  return (
    <button
      type="button"
      className={`plant-icon-btn ${bouncing ? 'plant-bounce' : ''}`}
      onClick={onClick}
      title="Click to view your plant's growth!"
      aria-label={`View productivity plant: ${currentStage.name}, Level ${currentStage.level}`}
    >
      <div className="plant-icon-emoji-wrap">
        <span className="plant-icon-emoji">{currentStage.emoji}</span>
      </div>
      <div className="plant-icon-info">
        <div className="plant-icon-top">
          <span className="plant-icon-level">Lvl {currentStage.level}</span>
          <span className="plant-icon-name">{currentStage.name}</span>
        </div>
        <div className="plant-icon-bar-bg">
          <div
            className="plant-icon-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </button>
  );
}
