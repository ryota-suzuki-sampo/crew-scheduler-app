from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Ship(db.Model):
    __tablename__ = 'ship_list'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    color_code = db.Column(db.String, default='#cccccc')

class CrewMember(db.Model):
    __tablename__ = 'crew_members'
    id = db.Column(db.Integer, primary_key=True)
    last_name = db.Column(db.String, nullable=False)
    first_name = db.Column(db.String, nullable=False)
    employee_code = db.Column(db.String)

class Assignment(db.Model):
    __tablename__ = 'assignments'
    id = db.Column(db.Integer, primary_key=True)
    crew_id = db.Column(db.Integer, db.ForeignKey('crew_members.id'), nullable=False)
    ship_id = db.Column(db.Integer, db.ForeignKey('ship_list.id'), nullable=False)
    onboard_date = db.Column(db.Date, nullable=False)
    offboard_date = db.Column(db.Date)
    status = db.Column(db.String, nullable=False)
    
    # 関連付け（JOIN用）
    crew = db.relationship('CrewMember', backref='assignments')
    ship = db.relationship('Ship', backref='assignments')
