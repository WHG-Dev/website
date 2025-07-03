from flask import Flask

app = Flask(__name__)

@app.route("/values")
def get_values():
    return '{"temperature":22.799999237060547,"humidity":52.200000762939453,"gasval":17,"time":"16:00","hour":16,"name":"H014"}%{"temperature":22.700000762939453,"humidity":53.099998474121094,"gasval":18,"time":"17:00","hour":17,"name":"H014"}%{"temperature":22.5,"humidity":52.599998474121094,"gasval":17,"time":"18:00","hour":18,"name":"H014"}%{"temperature":22.799999237060547,"humidity":52.700000762939453,"gasval":17,"time":"19:00","hour":19,"name":"H014"}%{"temperature":22.799999237060547,"humidity":52.799999237060547,"gasval":17,"time":"20:00","hour":20,"name":"H014"}%H014%none%none%none%none%none%none%none%none%none'

if __name__ == '__main__':
    app.run(port=5173)