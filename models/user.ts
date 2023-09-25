import crypto from 'crypto';
import { Config } from './config';

export class User{
    private username: string;
    private passwordHash: string;
    private lastToken: string;
    private static config = new Config();

    constructor(username: string = "", password: string = "", isPassword: boolean = true){
        this.username = username;
        if(isPassword){
            this.passwordHash = this.computeHash(password);
        }
        else{
            this.passwordHash = password;
        }
        this.lastToken = "";
    }
    
    private computeHash(password: string): string{
        let hash = crypto.createHash('sha256');
        hash.update(this.username + password);
        return hash.digest('hex');
    }

    public getUsername(): string{
        return this.username;
    }

    public checkPassword(password: string): boolean{
        return this.passwordHash == this.computeHash(password);
    }

    public isTokenValid(token: string): boolean{
        return this.lastToken == token;
    }

    public getToken(): string{
        return this.lastToken;
    }

    public generateToken(): string{
        this.lastToken = crypto.randomUUID();
        return this.lastToken;
    }

    public resetToken(): void{
        this.lastToken = "";
    }

    public getPasswordHash(): string{
        return this.passwordHash;
    }

    static isValidUsername(username: string): boolean{
        let minLen = User.config.getMinUsernameLength();
        let maxLen = User.config.getMaxUsernameLength();
        if (username.length < minLen || username.length > maxLen){
            return false;
        }
        let regex = /^[a-z][a-z0-9_-]*$/;
        let forbidden: string[] = User.config.getForbiddenUsernames();
        return regex.test(username) && !forbidden.includes(username);
    }
}