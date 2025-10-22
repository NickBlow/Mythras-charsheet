import { Plus, X, Zap, Sparkles } from "lucide-react";
import { useState } from "react";

interface PowersTabProps {
  powers: any[];
  updateCharacter: (updates: any) => void;
}

const PowersTab = ({ powers, updateCharacter }: PowersTabProps) => {
  const [showAddPower, setShowAddPower] = useState(false);
  const [newPower, setNewPower] = useState({
    name: "",
    type: "Light Side",
    description: "",
  });

  const handleAddPower = () => {
    if (!newPower.name) return;

    const power = {
      id: Date.now(),
      ...newPower,
    };

    updateCharacter({ powers: [...powers, power] });
    setNewPower({
      name: "",
      type: "Light Side",
      description: "",
    });
    setShowAddPower(false);
  };

  const handleUpdatePower = (id: number, field: string, value: any) => {
    const updatedPowers = powers.map((power: any) =>
      power.id === id ? { ...power, [field]: value } : power
    );
    updateCharacter({ powers: updatedPowers });
  };

  const handleRemovePower = (id: number) => {
    const updatedPowers = powers.filter((power: any) => power.id !== id);
    updateCharacter({ powers: updatedPowers });
  };

  const powerTypeColors = {
    "Light Side": "text-blue-400 border-blue-500/50 bg-blue-600/10",
    "Dark Side": "text-red-400 border-red-500/50 bg-red-600/10",
    Universal: "text-purple-400 border-purple-500/50 bg-purple-600/10",
    Other: "text-gray-400 border-gray-500/50 bg-gray-600/10",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-cyan-300 glow-cyan flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          Force Powers & Abilities
        </h3>
        <button
          onClick={() => setShowAddPower(true)}
          className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/50 rounded-lg hover:bg-cyan-600/30 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Power
        </button>
      </div>

      {/* Add Power Form */}
      {showAddPower && (
        <div className="bg-gray-800/50 border border-cyan-500/30 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-2">
                Power Name
              </label>
              <input
                type="text"
                value={newPower.name}
                onChange={(e) =>
                  setNewPower({ ...newPower, name: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
                placeholder="Force Push, Mind Trick, Lightning..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-cyan-300 mb-2">
                Type
              </label>
              <select
                value={newPower.type}
                onChange={(e) =>
                  setNewPower({ ...newPower, type: e.target.value })
                }
                className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="Light Side">Light Side</option>
                <option value="Dark Side">Dark Side</option>
                <option value="Universal">Universal</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cyan-300 mb-2">
              Description
            </label>
            <textarea
              value={newPower.description}
              onChange={(e) =>
                setNewPower({ ...newPower, description: e.target.value })
              }
              className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
              placeholder="Describe the power's effect, how it works, any special conditions..."
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddPower}
              disabled={!newPower.name}
              className="flex-1 px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Power
            </button>
            <button
              onClick={() => {
                setShowAddPower(false);
                setNewPower({
                  name: "",
                  type: "Light Side",
                  description: "",
                });
              }}
              className="flex-1 px-4 py-2 bg-red-600/20 border border-red-500/50 rounded-lg hover:bg-red-600/30 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Powers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {powers.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-400">
            No Force powers learned yet. Click "Add Power" to begin your
            training.
          </div>
        ) : (
          powers.map((power: any) => (
            <div key={power.id} className="hologram rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  <input
                    type="text"
                    value={power.name}
                    onChange={(e) =>
                      handleUpdatePower(power.id, "name", e.target.value)
                    }
                    className="text-lg font-semibold bg-transparent border-b border-cyan-500/30 text-cyan-300 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <button
                  onClick={() => handleRemovePower(power.id)}
                  className="p-1 bg-red-600/20 border border-red-500/50 rounded hover:bg-red-600/30 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <div className="mb-3">
                <select
                  value={power.type}
                  onChange={(e) =>
                    handleUpdatePower(power.id, "type", e.target.value)
                  }
                  className={`px-2 py-1 rounded text-xs border ${powerTypeColors[power.type as keyof typeof powerTypeColors] || powerTypeColors["Other"]}`}
                >
                  <option value="Light Side">Light Side</option>
                  <option value="Dark Side">Dark Side</option>
                  <option value="Universal">Universal</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <textarea
                value={power.description || ""}
                onChange={(e) =>
                  handleUpdatePower(power.id, "description", e.target.value)
                }
                className="w-full px-2 py-1 bg-gray-800/30 border border-cyan-500/20 rounded text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50"
                placeholder="Power description..."
                rows={3}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PowersTab;
