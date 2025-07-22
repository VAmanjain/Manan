export {}

declare global {
    interface CustomJwtSessionClaims {
        userid: string,
        name?: string
        email?: string
    }
}