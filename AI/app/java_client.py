import pandas as pd

def get_station_history(station_id):

    df = pd.read_csv("../data/station_hour.csv")

    df = df[df["StationId"] == station_id]

    return df