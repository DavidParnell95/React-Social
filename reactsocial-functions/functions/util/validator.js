const isEmpty = (string) => {
    if(string.trim() === '')
    {
        return true;
    }

    else{ return false }
}


//checks if valid email
const isEmail = (email) => {
    const regEX = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    if(email.match(regEX))
    {
        return true;
    }

    else{
        return false;
    }
}

exports.validateSignupData = (data) => {
    let errors = {};

    //Email Checking 
    //Check if email entered
    if(isEmpty(data.email))
    {
        errors.email = "Mustn't be empty"
    }

    //Check if email is a valid email
    else if(!isEmail(data.email))
    {
        errors.email = "Must be a valid email address"
    }

    //Password Checking
    //Check if password entered
    if(isEmpty(data.password)){ 
        errors.password = "Mustn't be Empty"
    }

    //Check if password and confirmPassword match
    if(data.password !== data.confirmPassord)
    {
        errors.confirmPassord = "Passwords do not match"
    }

    if(isEmpty(data.handle))
    {
        errors.handle = "Mustn't be empty"
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}

exports.validateLoginData = (data) => {
    let errors = {};

    //check email
    if(isEmpty(data.email)) {
        errors.email = "Mustn't be empty"
    }

    //Check password
    if(isEmpty(data.password)) {
        errors.password = "Mustn't be empty"
    }

    return {
        errors,
        valid: Object.keys(errors).length === 0 ? true : false
    }
}