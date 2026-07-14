from app.services.attribution.rules import (
    meteorology_score,
    traffic_score,
    construction_score,
    industry_score
)

from app.services.attribution.scorer import (
    compute_confidence
)

from app.services.attribution.explanations import (
    build_explanation
)


def attribute_sources(
    weather,
    geo,
    pollutants
):

    traffic, traffic_reason = traffic_score(
        weather,
        geo,
        pollutants
    )

    industry, industry_reason = industry_score(
        weather,
        geo,
        pollutants
    )

    construction, construction_reason = construction_score(
        weather,
        geo,
        pollutants
    )

    meteorology, met_reason = meteorology_score(
        weather
    )

    scores = {

        "traffic": traffic,

        "industry": industry,

        "construction": construction,

        "meteorology": meteorology

    }

    reasons = {

        "traffic": traffic_reason,

        "industry": industry_reason,

        "construction": construction_reason,

        "meteorology": met_reason

    }

    result = compute_confidence(scores)

    return build_explanation(
        result,
        reasons
    )