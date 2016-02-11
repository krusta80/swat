
interface Season {
    /**
     A localized name for the object, suitable for display to users. The text is title
     cased.
     */
    name: string;

    /**
     A localized description, suitable for display to users.
     */
    id: string;

    }

/**
 A listing of weapons supported in the title. There is no significance to the ordering.
 */
declare type Seasons = Season[];
