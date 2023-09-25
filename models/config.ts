var fs = require('fs');

export class Config{
    private port: number = 0;
    private maxUsernameLength: number = 0;
    private minUsernameLength: number = 0;
    private maxMessageLength: number = 0;
    private forbiddenUsernames: string[] = [];
    private static instance: Config;

    constructor(filename: string = "config.json"){
        if (Config.instance){
            return Config.instance;
        }
        this.readFromFile(filename);
        Config.instance = this;
        this.writeToFile(filename);
    }

    static getInstance(): Config{
        return new Config();
    }

    public tryReadFromFileJson(filename: string): any{
        try{
            let data = fs.readFileSync(filename, 'utf8');
            let json = JSON.parse(data);
            return json;
        }
        catch(e){
            return {};
        }
    }

    public readFromFile(filename: string): void{
        this.createFileIfNotExists(filename);
        let json = this.tryReadFromFileJson(filename);
        this.port = json.port ?? 9001;
        this.maxUsernameLength = json.maxUsernameLength ?? 20;
        this.minUsernameLength = json.minUsernameLength ?? 3;
        if (this.minUsernameLength > this.maxUsernameLength){
            throw new Error("minUsernameLength cannot be greater than maxUsernameLength");
        }
        this.maxMessageLength = json.maxMessageLength ?? 1000;
        if (this.maxMessageLength < 1){
            throw new Error("maxMessageLength must be greater than 0");
        }
        this.forbiddenUsernames = json.forbiddenUsernames ?? [
            "admin", "administrator", "administration",
            "root", "superuser", "super",
            "moderator", "mod", "moderation"
        ];
    }

    public writeToFile(filename: string): void{
        let data = JSON.stringify(this);
        fs.writeFileSync(filename, data);
    }

    private createFileIfNotExists(filename: string): void{
        let fs = require('fs');
        if(!fs.existsSync(filename)){
            fs.writeFileSync(filename, "");
        }
    }

    public getPort() { return this.port; }
    public getMaxUsernameLength() { return this.maxUsernameLength; }
    public getMinUsernameLength() { return this.minUsernameLength; }
    public getMaxMessageLength() { return this.maxMessageLength; }
    public getForbiddenUsernames() { return this.forbiddenUsernames; }
}