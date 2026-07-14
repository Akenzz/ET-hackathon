def compute_confidence(scores):

    total = sum(scores.values())

    if total == 0:

        return {

            "likelySource": "Unknown",

            "confidence": 0,

            "scores": scores

        }

    winner = max(scores, key=scores.get)

    confidence = scores[winner] / total

    return {

        "likelySource": winner.title(),

        "confidence": round(confidence, 2),

        "scores": scores

    }