import { useState, useEffect, useCallback, useRef } from "react";
import {
  Save,
  Share2,
  Check,
  Clipboard,
  History,
  Upload,
  User,
  Activity,
  Briefcase,
  Sparkles,
  Zap,
  Package,
  Users,
  Settings,
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import InfoTab from "./InfoTab";
import StatsTab from "./StatsTab";
import SkillsTab from "./SkillsTab";
import OrdersTab from "./OrdersTab";
import PowersTab from "./PowersTab";
import EquipmentTab from "./EquipmentTab";
import VersionHistoryModal from "./VersionHistoryModal";
import {
  useFetcher,
  useNavigate,
  useRevalidator,
  useSearchParams,
  useLocation,
} from "react-router";

const MythrasCharacterSheet = ({
  initialData: charData,
  initialImage,
}: {
  initialData: any;
  initialImage: string | null;
}) => {
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Utilities & Refs
  const previousCharacterRef = useRef<string | null>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedCharacterRef = useRef<string | null>(null);
  const fetcher = useFetcher();

  // UI State
  const [showToast, setShowToast] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [characterImage, setCharacterImage] = useState<string | null>(
    initialImage
  );
  const [isImageUploading, setIsImageUploading] = useState(false);

  // Active tab logic (hash-based)
  const validTabs = [
    "info",
    "stats",
    "skills",
    "orders",
    "powers",
    "equipment",
  ] as const;

  const tabFromHash = location.hash.slice(1); // remove leading '#'
  const activeTab = validTabs.includes(tabFromHash as any)
    ? tabFromHash
    : "info";

  // Character state with Mythras Star Wars structure
  const [character, setCharacter] = useState(() => {
    const data = charData || {
      info: {
        name: "",
        culture: "",
        careers: [],
        experienceRolls: 0,
        notes: "",
        passions: [],
        affinityToLight: 0,
      },
      stats: {
        str: 10,
        con: 10,
        siz: 10,
        dex: 10,
        int: 10,
        pow: 10,
        cha: 10,
        actionPoints: 2,
        damageModifier: "0",
        expMod: 0,
        healingRate: 2,
        initiative: 10,
        forcePoints: { current: 2, max: 2 },
        tenacity: { current: 10, max: 10 },
        movement: 6,
      },
      hitPoints: {
        head: { current: 4, max: 4 },
        chest: { current: 6, max: 6 },
        abdomen: { current: 5, max: 5 },
        leftArm: { current: 3, max: 3 },
        rightArm: { current: 3, max: 3 },
        leftLeg: { current: 4, max: 4 },
        rightLeg: { current: 4, max: 4 },
      },
      skills: [],
      equipment: {
        weapons: [],
        armor: [],
        misc: [],
        encumbrance: 0,
      },
      orders: [],
      powers: [],
    };
    return data;
  });

  // Version management
  useEffect(() => {
    if (charData && previousCharacterRef.current) {
      const prevData = JSON.parse(previousCharacterRef.current);
      if (JSON.stringify(prevData) !== JSON.stringify(charData)) {
        setCharacter(charData);
        lastSavedCharacterRef.current = JSON.stringify(charData);
      }
    } else if (charData) {
      setCharacter(charData);
      lastSavedCharacterRef.current = JSON.stringify(charData);
    }
    previousCharacterRef.current = JSON.stringify(charData);
  }, [charData]);

  // Save function
  const saveCharacter = useCallback(() => {
    const characterString = JSON.stringify(character);

    // Don't save if nothing changed since last save
    if (lastSavedCharacterRef.current === characterString) {
      return;
    }

    const formData = new FormData();
    formData.append("data", characterString);

    fetcher.submit(formData, {
      method: "post",
      action: location.pathname,
    });

    // Update last saved state
    lastSavedCharacterRef.current = characterString;

    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  }, [character, fetcher, location.pathname]);

  // Autosave - only trigger when character actually changes
  useEffect(() => {
    // Don't autosave on initial load
    if (!lastSavedCharacterRef.current) return;

    // Don't autosave if character hasn't changed from last saved state
    const characterString = JSON.stringify(character);
    const hasChanges = characterString !== lastSavedCharacterRef.current;
    if (!hasChanges) return;

    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(() => {
      saveCharacter();
    }, 3000);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [character, saveCharacter]);

  // Share function
  const shareCharacterLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Character link copied to clipboard!");
  };

  // Image upload handler
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsImageUploading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setCharacterImage(base64String);

        // Save image to durable object
        const formData = new FormData();
        formData.append("action", "saveImage");
        formData.append("imageData", base64String);

        fetcher.submit(formData, {
          method: "post",
          action: location.pathname,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Update functions
  const updateCharacter = (updates: any) => {
    setCharacter((prev: any) => ({ ...prev, ...updates }));
  };

  const updateInfo = (updates: any) => {
    setCharacter((prev: any) => ({
      ...prev,
      info: { ...prev.info, ...updates },
    }));
  };

  const updateStats = (updates: any) => {
    setCharacter((prev: any) => ({
      ...prev,
      stats: { ...prev.stats, ...updates },
    }));
  };

  const updateHitPoints = (
    location: string,
    field: "current" | "max",
    value: number
  ) => {
    setCharacter((prev: any) => ({
      ...prev,
      hitPoints: {
        ...prev.hitPoints,
        [location]: {
          ...prev.hitPoints[location],
          [field]: value,
        },
      },
    }));
  };

  const tabIcons = {
    info: <User className="w-4 h-4" />,
    stats: <Activity className="w-4 h-4" />,
    skills: <Briefcase className="w-4 h-4" />,
    orders: <Settings className="w-4 h-4" />,
    powers: <Zap className="w-4 h-4" />,
    equipment: <Package className="w-4 h-4" />,
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-cyan-500/30 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-['Orbitron'] glow-cyan">
              {character.info.name || "New Operative"}
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowVersionHistory(true)}
                className="px-4 py-2 bg-purple-600/20 border border-purple-500/50 rounded-lg hover:bg-purple-600/30 transition-colors flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                History
              </button>
              <button
                onClick={saveCharacter}
                className="px-4 py-2 bg-blue-600/20 border border-blue-500/50 rounded-lg hover:bg-blue-600/30 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={shareCharacterLink}
                className="px-4 py-2 bg-green-600/20 border border-green-500/50 rounded-lg hover:bg-green-600/30 transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-900/50 border-b border-cyan-500/20 sticky top-[73px] z-10 backdrop-blur">
        <div className="container mx-auto px-4">
          <nav className="flex gap-1 overflow-x-auto py-2">
            {validTabs.map((tab) => (
              <a
                key={tab}
                href={`#${tab}`}
                className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab
                    ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300"
                    : "hover:bg-gray-800/50 text-gray-400 hover:text-gray-200"
                }`}
              >
                {tabIcons[tab]}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </a>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="hologram-border rounded-xl p-6 bg-gray-900/30 backdrop-blur">
          {activeTab === "info" && (
            <InfoTab
              character={character}
              updateInfo={updateInfo}
              characterImage={characterImage}
              onImageUpload={handleImageUpload}
            />
          )}
          {activeTab === "stats" && (
            <StatsTab
              stats={character.stats}
              hitPoints={character.hitPoints}
              equipment={character.equipment}
              updateStats={updateStats}
              updateHitPoints={updateHitPoints}
            />
          )}
          {activeTab === "skills" && (
            <SkillsTab
              skills={character.skills}
              updateCharacter={updateCharacter}
            />
          )}
          {activeTab === "orders" && (
            <OrdersTab
              orders={character.orders}
              updateCharacter={updateCharacter}
            />
          )}
          {activeTab === "powers" && (
            <PowersTab
              powers={character.powers}
              updateCharacter={updateCharacter}
            />
          )}
          {activeTab === "equipment" && (
            <EquipmentTab
              equipment={character.equipment}
              updateCharacter={updateCharacter}
            />
          )}
        </div>
      </main>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 px-6 py-3 bg-green-600/20 border border-green-500/50 rounded-lg backdrop-blur flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400" />
          <span className="text-green-300">Character saved!</span>
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && (
        <VersionHistoryModal
          onClose={() => setShowVersionHistory(false)}
          currentCharacter={character}
        />
      )}
    </div>
  );
};

export default MythrasCharacterSheet;
