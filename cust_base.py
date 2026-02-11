import os
import requests
import streamlit as st
import folium
from streamlit_folium import st_folium
from dotenv import load_dotenv
from folium.plugins import HeatMap

load_dotenv()

API_KEY = os.getenv("GMAPS_API_KEY")
PLACES_URL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"


# ---------- Google Places Fetch ----------
def get_places(lat, lon, radius, place_type):
    params = {
        "location": f"{lat},{lon}",
        "radius": radius,
        "type": place_type,
        "key": API_KEY,
    }

    res = requests.get(PLACES_URL, params=params).json()
    return res.get("results", [])


# ---------- Customer Score ----------
def compute_customer_score(data):
    apartments = len(data["apartments"])
    education = len(data["schools"]) + len(data["universities"])
    offices = len(data["offices"])
    transit = len(data["bus"]) + len(data["subway"])
    competitors = len(data["cafes"]) + len(data["restaurants"])

    score = (
        apartments * 0.4
        + education * 0.2
        + offices * 0.2
        + transit * 0.1
        - competitors * 0.1
    )

    return round(score, 2)


# ---------- Streamlit UI ----------
st.set_page_config(page_title="BizMind Customer Heatmap", layout="wide")

st.title("📍 BizMind – Customer Base Heatmap")

col1, col2 = st.columns(2)

with col1:
    lat = st.number_input("Latitude", value=12.9716)
    lon = st.number_input("Longitude", value=80.2210)
    radius = st.slider("Radius (meters)", 200, 3000, 1000)

if st.button("Analyze Location"):

    # Fetch nearby data
    data = {
        "apartments": get_places(lat, lon, radius, "apartment"),
        "schools": get_places(lat, lon, radius, "school"),
        "universities": get_places(lat, lon, radius, "university"),
        "offices": get_places(lat, lon, radius, "office"),
        "bus": get_places(lat, lon, radius, "bus_station"),
        "subway": get_places(lat, lon, radius, "subway_station"),
        "cafes": get_places(lat, lon, radius, "cafe"),
        "restaurants": get_places(lat, lon, radius, "restaurant"),
    }

    score = compute_customer_score(data)

    # ---------- Map ----------
    m = folium.Map(location=[lat, lon], zoom_start=15)

    # Radius circle
    folium.Circle(
        location=[lat, lon],
        radius=radius,
        color="blue",
        fill=True,
        fill_opacity=0.1,
    ).add_to(m)

    # Heatmap points (use cafes + restaurants as demand signal)
    heat_points = [
        [p["geometry"]["location"]["lat"], p["geometry"]["location"]["lng"]]
        for p in (data["cafes"] + data["restaurants"])
    ]

    if heat_points:
        HeatMap(heat_points).add_to(m)

    st.subheader("🗺️ Demand Heatmap")
    st_folium(m, width=900, height=500)

    # ---------- Metrics ----------
    st.subheader("📊 Customer Analysis")

    colA, colB, colC = st.columns(3)

    colA.metric("Apartments", len(data["apartments"]))
    colA.metric("Education Centers", len(data["schools"]) + len(data["universities"]))

    colB.metric("Offices", len(data["offices"]))
    colB.metric("Transit Points", len(data["bus"]) + len(data["subway"]))

    colC.metric("Competitors", len(data["cafes"]) + len(data["restaurants"]))
    colC.metric("Customer Score", score)

    # ---------- Insight ----------
    if score > 50:
        st.success("High customer potential – good location for business.")
    elif score > 20:
        st.warning("Moderate demand – depends on pricing & differentiation.")
    else:
        st.error("Low demand – consider alternate location.")
