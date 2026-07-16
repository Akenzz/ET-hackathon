def build_explanation(result, reasons):

    source = result["likelySource"].lower()

    return {

        "likelySource": result["likelySource"],

        "confidence": result["confidence"],

        "contributingFactors": reasons.get(source, ["No significant contributing factors detected"])

    }