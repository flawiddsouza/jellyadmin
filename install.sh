sudo systemctl stop jelly-database
sudo systemctl disable jelly-database

mkdir -p ~/.local/bin/jelly-database/
wget https://github.com/flawiddsouza/jelly-database/releases/download/v0.0.2/jelly-database-linux -O ~/.local/bin/jelly-database/jelly-database-linux
chmod +x ~/.local/bin/jelly-database/jelly-database-linux

echo "[Unit]
Description=Runs jelly database on system startup
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/.local/bin/jelly-database
ExecStart=$HOME/.local/bin/jelly-database/jelly-database-linux

[Install]
WantedBy=multi-user.target" | sudo tee /lib/systemd/system/jelly-database.service > /dev/null

sudo systemctl daemon-reload
sudo systemctl enable jelly-database
sudo systemctl start jelly-database

sleep 3

echo

sudo systemctl status jelly-database
