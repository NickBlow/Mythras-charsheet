import {
  Heart,
  Activity,
  Zap,
  Brain,
  Move,
  Shield,
  Sparkles,
} from "lucide-react";

interface StatsTabProps {
  stats: any;
  hitPoints: any;
  equipment?: any;
  updateStats: (updates: any) => void;
  updateHitPoints: (
    location: string,
    field: "current" | "max",
    value: number
  ) => void;
}

const StatsTab = ({
  stats,
  hitPoints,
  equipment,
  updateStats,
  updateHitPoints,
}: StatsTabProps) => {
  const damageModifierOptions = [
    { value: "-1d8", label: "-1d8", minSum: 0, maxSum: 5 },
    { value: "-1d6", label: "-1d6", minSum: 6, maxSum: 10 },
    { value: "-1d4", label: "-1d4", minSum: 11, maxSum: 15 },
    { value: "-1d2", label: "-1d2", minSum: 16, maxSum: 20 },
    { value: "0", label: "+0", minSum: 21, maxSum: 25 },
    { value: "+1d2", label: "+1d2", minSum: 26, maxSum: 30 },
    { value: "+1d4", label: "+1d4", minSum: 31, maxSum: 35 },
    { value: "+1d6", label: "+1d6", minSum: 36, maxSum: 40 },
    { value: "+1d8", label: "+1d8", minSum: 41, maxSum: 45 },
    { value: "+1d10", label: "+1d10", minSum: 46, maxSum: 50 },
    { value: "+1d12", label: "+1d12", minSum: 51, maxSum: 60 },
  ];
  const characteristics = [
    { key: "str", label: "STR", description: "Strength" },
    { key: "con", label: "CON", description: "Constitution" },
    { key: "siz", label: "SIZ", description: "Size" },
    { key: "dex", label: "DEX", description: "Dexterity" },
    { key: "int", label: "INT", description: "Intelligence" },
    { key: "pow", label: "POW", description: "Power" },
    { key: "cha", label: "CHA", description: "Charisma" },
  ];

  const derivedStats = [
    {
      key: "actionPoints",
      label: "Action Points",
      icon: <Activity className="w-4 h-4" />,
    },
    {
      key: "damageModifier",
      label: "Damage Modifier",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      key: "expMod",
      label: "Experience Modifier",
      icon: <Brain className="w-4 h-4" />,
    },
    {
      key: "healingRate",
      label: "Healing Rate",
      icon: <Heart className="w-4 h-4" />,
    },
    {
      key: "initiative",
      label: "Initiative",
      icon: <Move className="w-4 h-4" />,
    },
    {
      key: "movement",
      label: "Movement (m)",
      icon: <Move className="w-4 h-4" />,
    },
  ];

  const hitLocations = [
    { key: "head", label: "Head", rollRange: "01-03" },
    { key: "chest", label: "Chest", rollRange: "04-09" },
    { key: "abdomen", label: "Abdomen", rollRange: "10-12" },
    { key: "leftArm", label: "Left Arm", rollRange: "13-15" },
    { key: "rightArm", label: "Right Arm", rollRange: "16-18" },
    { key: "leftLeg", label: "Left Leg", rollRange: "19-20" },
    { key: "rightLeg", label: "Right Leg", rollRange: "19-20" },
  ];

  // Calculate armor initiative penalty based on Mythras formula
  // Add together the ENC for all the armour worn, and then divide by 5, rounding up
  const getArmorInitiativePenalty = () => {
    if (!equipment?.armor) return 0;

    // Calculate total ENC for worn armor, considering location coverage
    let totalArmorENC = 0;
    equipment.armor.forEach((armor: any) => {
      const encPerLocation = armor.enc || 0;
      if (armor.locations === "All") {
        // All 7 locations
        totalArmorENC += encPerLocation * 7;
      } else if (Array.isArray(armor.locations)) {
        // Specific locations
        totalArmorENC += encPerLocation * armor.locations.length;
      }
    });

    // Divide by 5 and round up
    return Math.ceil(totalArmorENC / 5);
  };

  const armorPenalty = getArmorInitiativePenalty();
  const effectiveInitiative = (stats.initiative || 0) - armorPenalty;

  return (
    <div className="space-y-6">
      {/* At a Glance Section */}
      {equipment && (
        <div>
          <h3 className="text-xl font-bold text-cyan-300 mb-4 glow-cyan">
            At a Glance
          </h3>
          <div className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-4">
            <h4 className="text-sm font-medium text-cyan-300 mb-3">
              Equipped Weapons
            </h4>
            {equipment.weapons && equipment.weapons.length > 0 ? (
              <div className="space-y-2">
                {equipment.weapons
                  .slice(0, 5)
                  .map((weapon: any, idx: number) => (
                    <div key={idx} className="text-sm">
                      <span className="text-gray-300 font-medium">
                        {weapon.name || "Unnamed"}
                      </span>
                      <div className="text-xs text-gray-400">
                        Damage: {weapon.damage || "—"}
                        {weapon.addDamageModifier &&
                          stats.damageModifier !== "0" && (
                            <span className="text-yellow-400">
                              {" "}
                              {stats.damageModifier}
                            </span>
                          )}
                        {weapon.range && <span> • Range: {weapon.range}</span>}
                        {weapon.traits && <span> • {weapon.traits}</span>}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No weapons equipped</div>
            )}
          </div>
        </div>
      )}
      {/* Hit Points */}
      <div>
        <h3 className="text-xl font-bold text-cyan-300 mb-4 glow-cyan">
          Hit Points & Armor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {hitLocations.map((location) => {
            const locationAP =
              equipment?.armor?.reduce((sum: number, armor: any) => {
                if (
                  armor.locations === "All" ||
                  (Array.isArray(armor.locations) &&
                    armor.locations.includes(location.label))
                ) {
                  return sum + (armor.armorPoints || 0);
                }
                return sum;
              }, 0) || 0;

            return (
              <div
                key={location.key}
                className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-cyan-300">
                    {location.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">
                      {location.rollRange}
                    </span>
                    {locationAP > 0 && (
                      <span className="text-xs bg-gray-700/50 px-2 py-0.5 rounded text-yellow-400">
                        {locationAP} AP
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Current</label>
                    <input
                      type="number"
                      value={hitPoints[location.key]?.current || 0}
                      onChange={(e) =>
                        updateHitPoints(
                          location.key,
                          "current",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-center text-lg font-bold text-gray-100 focus:outline-none focus:border-cyan-500/50"
                      min="0"
                    />
                  </div>
                  <div className="text-xl text-gray-500 self-end pb-1">/</div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-400">Max</label>
                    <input
                      type="number"
                      value={hitPoints[location.key]?.max || 0}
                      onChange={(e) =>
                        updateHitPoints(
                          location.key,
                          "max",
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-center text-lg font-bold text-gray-100 focus:outline-none focus:border-cyan-500/50"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Force Points & Tenacity */}
      <div>
        <h3 className="text-xl font-bold text-cyan-300 mb-4 glow-cyan">
          Force Points & Tenacity
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          {/* Force Points (Luck) */}
          <div className="bg-gray-800/30 border border-yellow-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              <span className="font-medium text-yellow-400">Force Points</span>
              <span className="text-xs text-gray-400">(Luck Points)</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400">Current</label>
                <input
                  type="number"
                  value={stats.forcePoints?.current || 0}
                  onChange={(e) =>
                    updateStats({
                      forcePoints: {
                        ...stats.forcePoints,
                        current: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-800/50 border border-yellow-500/30 rounded text-center text-lg font-bold text-gray-100 focus:outline-none focus:border-yellow-500/50"
                  min="0"
                />
              </div>
              <div className="text-xl text-gray-500 self-end pb-1">/</div>
              <div className="flex-1">
                <label className="text-xs text-gray-400">Max</label>
                <input
                  type="number"
                  value={stats.forcePoints?.max || 0}
                  onChange={(e) =>
                    updateStats({
                      forcePoints: {
                        ...stats.forcePoints,
                        max: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-800/50 border border-yellow-500/30 rounded text-center text-lg font-bold text-gray-100 focus:outline-none focus:border-yellow-500/50"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Tenacity (Magic Points) */}
          <div className="bg-gray-800/30 border border-purple-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-purple-400" />
              <span className="font-medium text-purple-400">Tenacity</span>
              <span className="text-xs text-gray-400">(Magic Points)</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-400">Current</label>
                <input
                  type="number"
                  value={stats.tenacity?.current || 0}
                  onChange={(e) =>
                    updateStats({
                      tenacity: {
                        ...stats.tenacity,
                        current: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-800/50 border border-purple-500/30 rounded text-center text-lg font-bold text-gray-100 focus:outline-none focus:border-purple-500/50"
                  min="0"
                />
              </div>
              <div className="text-xl text-gray-500 self-end pb-1">/</div>
              <div className="flex-1">
                <label className="text-xs text-gray-400">Max</label>
                <input
                  type="number"
                  value={stats.tenacity?.max || 0}
                  onChange={(e) =>
                    updateStats({
                      tenacity: {
                        ...stats.tenacity,
                        max: parseInt(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-2 py-1 bg-gray-800/50 border border-purple-500/30 rounded text-center text-lg font-bold text-gray-100 focus:outline-none focus:border-purple-500/50"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Characteristics */}
      <div>
        <h3 className="text-xl font-bold text-cyan-300 mb-4 glow-cyan">
          Characteristics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {characteristics.map((char) => (
            <div key={char.key} className="hologram rounded-lg p-4">
              <label className="block text-sm font-medium text-cyan-300 mb-1">
                {char.label}
              </label>
              <input
                type="number"
                value={stats[char.key] || 10}
                onChange={(e) =>
                  updateStats({ [char.key]: parseInt(e.target.value) || 10 })
                }
                className="w-full px-2 py-1 bg-gray-800/50 border border-cyan-500/30 rounded text-center text-2xl font-bold text-gray-100 focus:outline-none focus:border-cyan-500/50"
                min="1"
                max="30"
              />
              <div className="text-xs text-gray-400 mt-1">
                {char.description}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Derived Statistics */}
      <div>
        <h3 className="text-xl font-bold text-cyan-300 mb-4 glow-cyan">
          Derived Statistics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {derivedStats.map((stat) => (
            <div
              key={stat.key}
              className="bg-gray-800/30 border border-cyan-500/20 rounded-lg p-4"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-cyan-300 mb-2">
                {stat.icon}
                {stat.label}
              </label>
              {stat.key === "initiative" && armorPenalty > 0 ? (
                <div className="relative">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-gray-100">
                      {stats.initiative || 0}
                    </span>
                    <span className="text-red-400">-{armorPenalty}</span>
                    <span className="text-gray-100">=</span>
                    <span className="text-lg font-bold text-gray-100">
                      {effectiveInitiative}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">From armor</div>
                </div>
              ) : stat.key === "damageModifier" ? (
                <select
                  value={stats[stat.key] || "0"}
                  onChange={(e) => updateStats({ [stat.key]: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
                >
                  {damageModifierOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}{" "}
                      {opt.minSum === 51
                        ? `(STR+SIZ ${opt.minSum}+)`
                        : `(STR+SIZ ${opt.minSum}-${opt.maxSum})`}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={stats[stat.key] || 0}
                  onChange={(e) =>
                    updateStats({ [stat.key]: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-gray-100 focus:outline-none focus:border-cyan-500/50"
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsTab;
