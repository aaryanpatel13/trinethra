import json
import re


def parse_llm_response(raw: str) -> dict:
    # Strategy 1: direct parse — works most of the time
    try:
        return json.loads(raw.strip())
    except json.JSONDecodeError:
        pass

    # Strategy 2: strip markdown code fences (```json ... ```)
    cleaned = re.sub(r'```(?:json)?', '', raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Strategy 3: find the JSON block by locating the outermost { }
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # all 3 failed — return error so the caller can handle it
    return {
        "parse_error": True,
        "raw_response": raw[:500]
    }