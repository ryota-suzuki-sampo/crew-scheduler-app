from flask import Blueprint, jsonify, request
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

@api.route("/assignments", methods=["POST"])
def create_assignment():
    data = request.get_json()
    print("POSTデータ:", data)  # ← 追加

    # 必須項目のチェック（簡易）
    required_fields = ["crew_id", "ship_id", "onboard_date", "status"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"{field} is required"}), 400

    try:
        new_assignment = Assignment(
            crew_id=data["crew_id"],
            ship_id=data["ship_id"],
            onboard_date=data["onboard_date"],
            offboard_date=data.get("offboard_date"),
            status=data["status"]
        )
        db.session.add(new_assignment)
        db.session.commit()
        return jsonify({"message": "Assignment created successfully", "id": new_assignment.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
@api.route("/assignments/<int:assignment_id>", methods=["DELETE"])
def delete_assignment(assignment_id):
    assignment = Assignment.query.get(assignment_id)
    if not assignment:
        return jsonify({"error": "Assignment not found"}), 404

    try:
        db.session.delete(assignment)
        db.session.commit()
        return jsonify({"message": "Assignment deleted"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500