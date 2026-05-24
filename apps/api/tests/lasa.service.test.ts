import { detectLasaConflicts } from "../src/services/lasa.service";
import { supabase } from "../src/db/client";

// Mock the Supabase client
jest.mock("../src/db/client", () => ({
    supabase: {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
    },
}));

describe("LASA Detection Service", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockDatabaseResponse = (medicineNames: string[]) => {
        const mockData = medicineNames.map((name) => ({ brand_name: name }));
        (supabase.from("medicines").select("brand_name").not as jest.Mock).mockResolvedValue({
            data: mockData,
            error: null,
        });
    };

    it("should return empty array if no medicines in DB", async () => {
        mockDatabaseResponse([]);
        const matches = await detectLasaConflicts("Losec");
        expect(matches).toEqual([]);
    });

    it("should flag sound-alike medicines (Soundex)", async () => {
        // "Losec" and "Lasix" sound very similar phonetically
        mockDatabaseResponse(["Paracetamol", "Aspirin", "Lasix", "Ibuprofen"]);
        
        const matches = await detectLasaConflicts("Losec");
        
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0]).toMatchObject({
            name: "Lasix",
            type: "sound-alike",
            score: 1.0,
        });
    });

    it("should flag look-alike medicines visually (Jaro-Winkler)", async () => {
        // "Hydroxyzine" and "Hydralazine" are visually similar but sound different
        mockDatabaseResponse(["Amoxicillin", "Hydralazine", "Omeprazole"]);
        
        const matches = await detectLasaConflicts("Hydroxyzine");
        
        expect(matches.length).toBeGreaterThan(0);
        expect(matches[0]).toMatchObject({
            name: "Hydralazine",
            type: "look-alike",
        });
        // Score should be high (above 0.85 threshold)
        expect(matches[0].score).toBeGreaterThanOrEqual(0.85);
    });

    it("should not flag completely different medicines", async () => {
        mockDatabaseResponse(["Tylenol", "Advil", "Zyrtec"]);
        
        const matches = await detectLasaConflicts("Penicillin");
        
        expect(matches.length).toBe(0);
    });

    it("should ignore exact matches (prevent self-flagging)", async () => {
        mockDatabaseResponse(["Losec"]);
        
        const matches = await detectLasaConflicts("Losec");
        
        expect(matches.length).toBe(0); // Should not flag itself
    });
});
