from flask import Blueprint, jsonify
from models import db, Assignment, CrewMember, Ship

api = Blueprint('api', __name__)

@api.route("/assignments", methods=["GET"])
def get_assignments():
    assignments = Assignment.query.all()
    result = []
    for a in assignments:
        result.append({
            "id": a.id,
            "crew_name": f"{a.crew.last_name} {a.crew.first_name}",
            "ship_name": a.ship.name,
            "onboard_date": a.onboard_date.strftime('%Y-%m-%d'),
            "offboard_date": a.offboard_date.strftime('%Y-%m-%d') if a.offboard_date else None,
            "status": a.status
        })
    return jsonify(result)

@api.route("/ships", methods=["GET"])
def get_ships():
    ships = Ship.query.all()
    result = [{
        "id": ship.id,
        "name": ship.name,
        "color_code": ship.color_code
    } for ship in ships]
    return jsonify(result)

@api.route("/crew_members", methods=["GET"])
def get_crew_members():
    crew = CrewMember.query.all()
    result = [{
        "id": member.id,
        "last_name": member.last_name,
        "first_name": member.first_name,
        "employee_code": member.employee_code
    } for member in crew]
    return jsonify(result)
