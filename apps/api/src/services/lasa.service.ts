import * as natural from "natural";
import { supabase } from "../db/client";

export type LasaMatchType = "sound-alike" | "look-alike";

export interface LasaMatch {
    name: string;
    type: LasaMatchType;
    score: number;
}

const JARO_WINKLER_THRESHOLD = 0.85;

export const detectLasaConflicts = async (medicineName: string): Promise<LasaMatch[]> => {
    // 1. Fetch all distinct medicine names from the database
    // In a production scenario with millions of records, you'd want to cache this 
    // or use database-level trigram/soundex functions. For this implementation, 
    // we fetch and process in-memory as a demonstration of the Node.js NLP approach.
    const { data, error } = await supabase
        .from("medicines")
        .select("brand_name")
        .not("brand_name", "is", null);

    if (error || !data) {
        throw new Error("Failed to fetch medicines for LASA check");
    }

    // Get unique names
    const allNames = Array.from(new Set(data.map((d) => d.brand_name.trim())));
    const matches: LasaMatch[] = [];
    const targetName = medicineName.trim().toLowerCase();
    
    // Instantiate SoundEx (natural v8 exports the class, not an instance)
    const soundEx = new (natural.SoundEx as any)();
    
    // Calculate phonetic code for target
    const targetSoundex = soundEx.process(targetName);

    for (const name of allNames) {
        const compareName = name.toLowerCase();
        
        // Exact matches aren't LASA conflicts, they are exactly the same
        if (targetName === compareName) {
            continue;
        }

        // 1. Sound-Alike Check (Soundex)
        if (targetSoundex === soundEx.process(compareName)) {
            matches.push({
                name: name,
                type: "sound-alike",
                score: 1.0, // Exact phonetic match
            });
            continue; // Skip look-alike check if already matched
        }

        // 2. Look-Alike Check (Jaro-Winkler)
        const jwScore = natural.JaroWinklerDistance(targetName, compareName, undefined);
        if (jwScore >= JARO_WINKLER_THRESHOLD) {
            matches.push({
                name: name,
                type: "look-alike",
                score: jwScore,
            });
        }
    }

    // Sort by score descending and take top 5 to avoid overwhelming the user
    return matches.sort((a, b) => b.score - a.score).slice(0, 5);
};
