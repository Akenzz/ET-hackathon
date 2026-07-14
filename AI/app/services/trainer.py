import pandas as pd
from xgboost import XGBRegressor

def train_station_model(df: pd.DataFrame) -> XGBRegressor:
    """
    Train an XGBoost regression model for a station using lag and weather features.
    
    Parameters
    ----------
    df : pd.DataFrame
        Training data containing target 'y', weather regressors, and optionally lag features.
    
    Returns
    -------
    XGBRegressor
        Trained XGBoost model.
    """
    df = df.copy()
    
    # Ensure datetime is sorted and normalized
    if "ds" in df.columns:
        df["ds"] = pd.to_datetime(df["ds"])
        df = df.sort_values("ds")
    
    # Construct lag features if they don't exist
    if "lag1" not in df.columns:
        df["lag1"] = df["y"].shift(1)
    if "lag2" not in df.columns:
        df["lag2"] = df["y"].shift(2)
    if "lag3" not in df.columns:
        df["lag3"] = df["y"].shift(3)
    if "rolling3" not in df.columns:
        df["rolling3"] = df["y"].rolling(3).mean()
        
    # Drop rows with NaN due to lag construction
    df = df.dropna().reset_index(drop=True)
    
    FEATURES = [
        "lag1",
        "lag2",
        "lag3",
        "rolling3",
        "temperature",
        "humidity",
        "precipitation",
        "pressure",
        "wind_speed",
        "wind_direction"
    ]
    TARGET = "y"
    
    # Validate that all features exist
    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns in training data: {missing}")
        
    model = XGBRegressor(
        n_estimators=500,
        learning_rate=0.03,
        max_depth=6,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="reg:squarederror",
        random_state=42
    )
    
    model.fit(df[FEATURES], df[TARGET])
    return model
