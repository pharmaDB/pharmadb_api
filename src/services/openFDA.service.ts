// ./src/services/drugs.service.ts
import { singleton } from 'tsyringe';
import { HTTPCacheService } from './httpCache.service';
import { OpenFDADrug } from './OpenFDADrug.interface';

@singleton()
export class OpenFDAService {
  private httpCacheService: HTTPCacheService;
  private searchBaseUrl: string = 'https://api.fda.gov/drug/drugsfda.json?search=';
  private labelBaseUrl: string = 'https://api.fda.gov/drug/label.json?search=';

  constructor(
    httpCacheService: HTTPCacheService,
  ) {
    this.httpCacheService = httpCacheService;
  }

  /**
   * 
   * @param applicationID 
   * @returns 
   */
  public getDrugByApplicationID = async (applicationID: string): Promise<OpenFDADrug> => {
    const results = await this.httpCacheService.get(`https://api.fda.gov/drug/drugsfda.json?search=application_number:${applicationID}&limit=1000`);
    return results[0];
  }

  /**
   * 
   * @param applicationID 
   * @returns 
   */
  public getLabelsByApplicationID = async (applicationID: string): Promise<any> => {
    const results = await this.httpCacheService.get(`https://api.fda.gov/drug/label.json?search=openfda.application_number:${applicationID}`);
    return results;
  }

  /**
   * Public search function which acts as the entry point for most services provided by the NDC
   * Service. Essentially just searches for a drug in the National Drug Code database.
   * @param query string: the value being for which a match or partial match is being sought
   * @param searchField string: the drug parameter scope of the search query
   */
  public search = async (query: string, searchField: string): Promise<OpenFDADrug[]> => {
    switch (searchField) {
      case 'brand_name': {
        return this.searchByProprietaryName(query);
      }
      case 'application_number': {
        return this.searchByApplicationNumber(query);
      }
      case 'generic_name': {
        return this.searchByNonProprietaryName(query);
      }
      case 'manufacturer_name': {
        return this.searchByManufacturer(query);
      }
      default: {
        throw new Error('Invalid search type. Search type must be "brand_name", "application_number", "generic_name", or "manufacturer"');
      }
    }
  }

  /**
   * Find drugs in the National Drug Code Directory based on the drugs proprietary name.
   * Returns up to 100 results in an array or an empty array of no results are found.
   * @param proprietaryName string: the proprietary name (brand name) of the drug
   */
  private searchByProprietaryName = async (proprietaryName: string): Promise<OpenFDADrug[]> => this.makeSearchRequest('openfda.brand_name', proprietaryName, 100);

  /**
   * Find drugs in the National Drug Code Directory based on the drugs FDA Application number.
   * Returns up to 100 results in an array or an empty array of no results are found.
   * @param applicationNumber string: the FDA marketing application number of a drug
   */
  private searchByApplicationNumber = async (applicationNumber: string): Promise<OpenFDADrug[]> => this.makeSearchRequest('application_number', applicationNumber, 100);

  /**
   * Find drugs in the National Drug Code Directory based on the drugs non-proprietary name.
   * Returns up to 100 results in an array or an empty array of no results are found.
   * @param nonProprietaryName string: the non-proprietary name (generic name) of the drug
   */
  private searchByNonProprietaryName = async (nonProprietaryName: string): Promise<OpenFDADrug[]> => this.makeSearchRequest('generic_name', nonProprietaryName, 100);

  /**
   * Find drugs in the National Drug Code Directory based on the drugs labler (manufacturer).
   * Returns up to 100 results in an array or an empty array of no results are found.
   * @param labeler string: the name of the drugs labeler (manufacturer)
   */
  private searchByManufacturer = async (labeler: string): Promise<OpenFDADrug[]> => this.makeSearchRequest('openfda.manufacturer_name', labeler, 100);

  /**
   * Dynamic search function to make an API call to the National Drug Code database and search for
   * information for a drug based on the parameter and value passed in.
   * @param p string: the name of the parameter that will be search through in the NDC databse
   * @param v string: the value parameter being searched for in the NDC databse
   * @param l nnumber: the upper limit of the number of possible results returned for the query
   */
  private makeSearchRequest = async (p: string, v: string, l: number): Promise<OpenFDADrug[]> => {
    const resultsArray: OpenFDADrug[] = [];
    let results = [];

    // try to make search query to the OpenFDA API, if there are no results return an empty array
    try {
      results = await this.httpCacheService.get(`${this.searchBaseUrl}${p}:${v}&limit=${l.toString()}`);
    } catch (err) {
      if (err.response.status === 404) {
        return resultsArray;
      }

      throw new Error(err);
    }

    // only respond with the data we need by mapping only specific params as our OpenFDADrug model
    results.forEach((result: OpenFDADrug) => {
      resultsArray.push({
        application_number: result.application_number,
        openfda: result.openfda,
        products: result.products,
      });
    });

    return resultsArray;
  }
}
