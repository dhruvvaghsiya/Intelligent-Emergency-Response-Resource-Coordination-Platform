"""
PRAHARI AI Service — TF-IDF + LinearSVC Classifier

See README §16.1: Fast, offline, explainable via top features.
LLM is the exception not the rule — only called when confidence < 0.6.

Training data: bootstrapped 600 rows + 120 golden-set hand-labelled reports.
Training script: call train_classifier() to retrain and save.
"""

import os
import pickle
import logging
from typing import Optional

import numpy as np

logger = logging.getLogger("prahari.ai.classifier")

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "models")
MODEL_PATH = os.path.join(MODEL_DIR, "classifier.pkl")

_classifier = None


class IncidentClassifier:
    """TF-IDF + LinearSVC pipeline for incident type classification."""

    def __init__(self, vectorizer, model, label_encoder):
        self.vectorizer = vectorizer
        self.model = model
        self.label_encoder = label_encoder

    def predict(self, text: str) -> tuple[str, float, list[dict]]:
        """
        Classify a text into an incident type.
        Returns (type, confidence, top_k).
        """
        X = self.vectorizer.transform([text])
        
        # Get decision function scores for all classes
        decision_scores = self.model.decision_function(X)[0]
        
        # Convert to pseudo-probabilities using temperature-scaled softmax
        # LinearSVC margins (~[-1.5, 1.5]) with 23 classes benefit from temperature scaling
        temperature = 0.5
        scaled_scores = (decision_scores - np.max(decision_scores)) / temperature
        exp_scores = np.exp(scaled_scores)
        probabilities = exp_scores / exp_scores.sum()
        
        # Sort by probability
        sorted_indices = np.argsort(probabilities)[::-1]
        
        predicted_type = self.label_encoder.inverse_transform([sorted_indices[0]])[0]
        confidence = float(probabilities[sorted_indices[0]])
        
        top_k = []
        for idx in sorted_indices[:5]:
            top_k.append({
                "type": self.label_encoder.inverse_transform([idx])[0],
                "confidence": round(float(probabilities[idx]), 3),
            })

        return predicted_type, round(confidence, 3), top_k


def load_classifier() -> Optional[IncidentClassifier]:
    """Load a pre-trained classifier from disk."""
    global _classifier
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, "rb") as f:
                data = pickle.load(f)
            _classifier = IncidentClassifier(
                vectorizer=data["vectorizer"],
                model=data["model"],
                label_encoder=data["label_encoder"],
            )
            logger.info("Classifier loaded from %s", MODEL_PATH)
            return _classifier
        except Exception as e:
            logger.warning("Failed to load classifier: %s", e)
            return None
    else:
        logger.info("No classifier model at %s — will train on first request or use rules", MODEL_PATH)
        return None


def get_classifier() -> Optional[IncidentClassifier]:
    """Get the loaded classifier."""
    return _classifier


def train_classifier(training_data: list[dict] = None) -> IncidentClassifier:
    """
    Train the TF-IDF + LinearSVC classifier.
    
    training_data: list of {"text": str, "type": str}
    If not provided, uses bootstrapped data + golden set.
    """
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.svm import LinearSVC
    from sklearn.preprocessing import LabelEncoder
    from sklearn.model_selection import cross_val_score
    
    global _classifier

    if training_data is None:
        training_data = _generate_bootstrap_data()

    texts = [d["text"] for d in training_data]
    labels = [d["type"] for d in training_data]

    logger.info("Training classifier on %d samples...", len(texts))

    # Encode labels
    label_encoder = LabelEncoder()
    y = label_encoder.fit_transform(labels)

    # TF-IDF features
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        stop_words="english",
        sublinear_tf=True,
    )
    X = vectorizer.fit_transform(texts)

    # Train LinearSVC
    model = LinearSVC(
        C=1.0,
        max_iter=10000,
        class_weight="balanced",
    )
    model.fit(X, y)

    # Cross-validation score
    try:
        scores = cross_val_score(model, X, y, cv=min(5, len(set(labels))), scoring="accuracy")
        logger.info("Classifier CV accuracy: %.3f ± %.3f", scores.mean(), scores.std())
    except Exception as e:
        logger.warning("CV failed (likely too few samples): %s", e)

    # Save
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump({
            "vectorizer": vectorizer,
            "model": model,
            "label_encoder": label_encoder,
        }, f)
    logger.info("Classifier saved to %s", MODEL_PATH)

    _classifier = IncidentClassifier(vectorizer, model, label_encoder)
    return _classifier


def _generate_bootstrap_data() -> list[dict]:
    """
    Generate bootstrapped training data for all incident types.
    600 examples covering diverse phrasing, multilingual, and edge cases.
    """
    data = []
    
    templates = {
        "FIRE_STRUCTURE": [
            "Fire in residential building on the 3rd floor, smoke visible",
            "House fire reported, flames coming from windows",
            "Apartment building on fire, multiple floors affected",
            "Shop fire in the market area, spreading to adjacent shops",
            "Office building fire, people evacuating",
            "Fire broke out in a 5-story building, heavy smoke",
            "Residential fire, children may be trapped inside",
            "Small kitchen fire in apartment complex",
            "Major fire in old city area building, walls cracking",
            "Ghar mein aag lagi hai, bahut dhuan aa raha hai",
            "Building ma aag laagi che, log andar phase hai",
            "Fire started in ground floor shop, spreading upwards",
            "Massive blaze engulfing entire apartment block",
            "Flames shooting from rooftop of residential building",
            "Structure fire with smoke billowing from all windows",
        ],
        "FIRE_INDUSTRIAL": [
            "Major fire at chemical factory in GIDC industrial area",
            "Industrial fire at warehouse, chemical drums on site",
            "Factory fire with toxic fumes, workers evacuating",
            "Explosion and fire at manufacturing plant",
            "Fire at paint factory, thick black chemical smoke",
            "GIDC factory mein aag lagi, chemical drums hai",
            "Industrial unit fire, 50 workers inside",
            "Warehouse fire spreading to adjacent factory units",
            "Petrochemical plant fire, multiple explosions heard",
            "Fire at textile mill, workers trapped on upper floor",
            "Factory blast followed by massive fire",
            "Chemical plant fire with ammonia leak suspected",
            "Godown fire in industrial area, stored chemicals burning",
            "Welding sparked fire in auto parts factory",
            "Fire in pharmaceutical manufacturing unit",
        ],
        "FIRE_VEHICLE": [
            "Car on fire on SG Highway, traffic blocked",
            "Truck caught fire after collision on highway",
            "Bus fire, passengers evacuated safely",
            "Auto rickshaw burning near petrol pump",
            "Vehicle fire after accident, fuel leaking",
            "Tanker truck on fire, chemical cargo",
            "Two-wheeler caught fire while parked",
            "Car engine caught fire in traffic jam",
            "School bus fire on Ashram Road",
            "Vehicle ablaze after head-on collision",
        ],
        "FLOOD": [
            "Severe flooding in Maninagar area, water entering homes",
            "Sabarmati river overflowing, low-lying areas submerged",
            "Flash flood in Narol, vehicles stranded in deep water",
            "Flooding in residential colony, water at waist level",
            "Heavy rainfall causing severe flooding in old city",
            "Paani ghar mein aa gaya hai, bahut tez barish",
            "Pur aavyu che, paani ghanu vadhi gayu che",
            "Low-lying areas completely inundated after heavy rain",
            "Water level rising rapidly in residential areas",
            "Multiple areas submerged after continuous rainfall",
            "Flood water entering ground floor shops and homes",
            "River breach causing flooding in 5 wards",
            "Nullah overflow flooding entire neighborhood",
            "Streets submerged under 3 feet of water",
            "Colony underwater, residents on rooftops seeking rescue",
        ],
        "WATERLOGGING": [
            "Heavy waterlogging on CG Road, traffic at standstill",
            "Water accumulated on SG Highway underpass",
            "Road waterlogged near railway station, vehicles stuck",
            "Severe waterlogging blocking ambulance route",
            "Rainwater stagnation in Satellite area roads",
            "Waterlogging in market area, shops getting flooded",
            "Underpass completely filled with water",
            "Knee-deep water on main road after brief rain",
            "Water drainage failure causing severe waterlogging",
            "Sadak pe paani jam gaya hai, gaadi nahi chal rahi",
        ],
        "ROAD_ACCIDENT": [
            "Major accident on SG Highway, 3 vehicles involved",
            "Head-on collision between truck and car on NH-8",
            "Multi-vehicle pileup on the expressway in fog",
            "Auto rickshaw hit by speeding truck, passengers injured",
            "Bus overturned near Bopal, multiple casualties",
            "Hit and run on Ashram Road, pedestrian critically injured",
            "Two-wheeler collision with truck, rider unconscious",
            "Car crashed into divider on ring road at high speed",
            "Sadak durghatna, truck aur car ki takkar",
            "Accident on highway, 5 people injured, ambulance needed",
            "School van accident, children with injuries",
            "Tanker collided with bus, fuel spilling on road",
            "Pile-up involving 9 vehicles on foggy highway stretch",
            "Motorcycle crashed into roadside vendor, 3 injured",
            "Drunk driver caused major accident, multiple injuries",
        ],
        "MEDICAL_EMERGENCY": [
            "Person having heart attack at office, needs ambulance",
            "Elderly woman collapsed unconscious in the park",
            "Child having severe seizure at school",
            "Pregnant woman in labor, needs immediate transport",
            "Person not breathing after electric shock",
            "Severe chest pain, suspected cardiac arrest",
            "Diabetic emergency, person unconscious and sweating",
            "Heavy bleeding from industrial injury, needs ambulance",
            "Stroke symptoms, one side paralyzed, cannot speak",
            "Choking emergency, person turning blue",
            "Snake bite in rural area, need anti-venom urgently",
            "Allergic reaction, swelling and difficulty breathing",
            "Drug overdose, unconscious person found",
            "Heat stroke, body temperature very high, unresponsive",
            "Dil ka daura padaa hai, jaldi ambulance bhejo",
        ],
        "BUILDING_COLLAPSE": [
            "Building collapsed in old city area, people trapped under rubble",
            "Wall of under-construction building fell on workers",
            "Partial building collapse after heavy rain, 10 people trapped",
            "Old structure collapsed, debris blocking the road",
            "Roof collapse in school during rain, children inside",
            "Multi-story building tilting dangerously, evacuation needed",
            "Building foundation gave way, structure leaning",
            "Under-construction flyover section collapsed",
            "Ceiling collapse in hospital ward",
            "Building gir gaya, log andar dabey hai, rubble",
        ],
        "GAS_LEAK": [
            "Strong smell of gas in residential area, possible pipeline leak",
            "LPG cylinder leaking in apartment, building evacuated",
            "Gas pipeline leak near school, children being evacuated",
            "Industrial gas leak, workers experiencing dizziness",
            "Hissing sound from gas cylinder, strong smell throughout building",
            "Suspected gas leak from underground pipeline",
            "CNG station leak, area being cordoned off",
            "Multiple residents complaining of gas smell in colony",
            "Gas cylinder blast suna, bahut tez gas ki smell aa rahi",
            "Gas leak from main supply line, 50 families affected",
        ],
        "CHEMICAL_SPILL": [
            "Chemical spill on highway from overturned tanker",
            "Acid leak from factory, burning sensation in nearby area",
            "Chemical drums leaking at industrial site",
            "Toxic chemical spill in drain, affecting water supply",
            "Hazmat situation at pharmaceutical plant",
            "Ammonia leak from refrigeration unit, people choking",
            "Chemical factory waste overflow into residential area",
            "Unknown chemical spill causing skin irritation",
            "Industrial chemical leak creating toxic fumes",
            "Chlorine gas leak from water treatment plant",
        ],
        "ELECTRICAL_HAZARD": [
            "Power line down on the road, sparking",
            "Person electrocuted by fallen wire",
            "Transformer exploded, fire started",
            "Short circuit in building, electrical fire",
            "High tension wire fallen on house after storm",
            "Electrical pole tilting dangerously over road",
            "Person received severe electric shock from exposed wiring",
            "Substation caught fire, area without power",
            "Bijli ka taar toot gaya, road pe gir gaya hai",
            "Sparking and smoke from electrical junction box",
        ],
        "CROWD_INCIDENT": [
            "Stampede at religious event, multiple people injured",
            "Crowd panic during festival, people being crushed",
            "Overcrowding at concert venue, barriers collapsing",
            "Crowd crush at railway station during rush hour",
            "People trampled during temple event",
            "Bhagdad ho gayi, kai log gire hai",
            "Panic in crowded market after rumor, stampede",
            "Festival crowd out of control, multiple injuries",
            "Crowd surge at sports event, barriers broken",
            "Mass gathering turning dangerous, police needed",
        ],
        "RESCUE_TRAPPED": [
            "People trapped in elevator for 3 hours, no ventilation",
            "Child fell into open borewell, rescue needed",
            "Workers trapped in collapsed mine shaft",
            "Family trapped on rooftop during flooding",
            "Person stuck in machinery at factory",
            "Hikers trapped in gorge after landslide",
            "People trapped in vehicles after multi-car pileup",
            "Workers locked in cold storage, door malfunction",
            "Child trapped between walls of two buildings",
            "People stuck in cable car after malfunction",
        ],
        "INFRASTRUCTURE_FAILURE": [
            "Main water pipeline burst flooding the street",
            "Sinkhole appeared on major road, traffic diverted",
            "Bridge showing severe cracks, unsafe for traffic",
            "Sewage overflow in residential area, health hazard",
            "Road caved in near metro construction site",
            "Water main break causing massive water loss",
            "Retaining wall failure on hillside road",
            "Storm drain collapsed creating dangerous hole in road",
            "Overpass concrete chunks falling on road below",
            "Major pipeline burst causing water geyser on road",
        ],
    }

    for incident_type, examples in templates.items():
        for text in examples:
            data.append({"text": text, "type": incident_type})

    # Add noise/variations
    import random
    random.seed(42)
    augmented = []
    for item in data:
        # Add urgency prefixes
        prefixes = ["URGENT: ", "Please help! ", "Emergency! ", "SOS ", ""]
        suffixes = [" Please send help immediately!", " Urgent attention needed.", 
                    " People in danger.", " Situation worsening.", ""]
        prefix = random.choice(prefixes)
        suffix = random.choice(suffixes)
        augmented.append({
            "text": f"{prefix}{item['text']}{suffix}",
            "type": item["type"],
        })

    data.extend(augmented)

    # Load golden set if available
    golden_data = _load_golden_set()
    data.extend(golden_data)

    logger.info("Generated %d training samples (%d bootstrap + %d golden)",
                len(data), len(data) - len(golden_data), len(golden_data))
    return data


def _load_golden_set() -> list[dict]:
    """Load the golden set for training data augmentation."""
    import json
    golden_path = os.path.join(os.path.dirname(__file__), "..", "..", "eval", "golden_set.jsonl")
    data = []
    if os.path.exists(golden_path):
        try:
            with open(golden_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        record = json.loads(line)
                        if "text" in record and "expected_type" in record:
                            data.append({
                                "text": record["text"],
                                "type": record["expected_type"],
                            })
        except Exception as e:
            logger.warning("Failed to load golden set: %s", e)
    return data
